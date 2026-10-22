const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');

// Run the actual TypeScript modules with only native/platform boundaries replaced.
function loadModule(relativePath, mocks = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, '..', relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const nativeRequire = createRequire(filename);
  const requireModule = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(filename), name);
      const target = [resolved, `${resolved}.ts`, `${resolved}.tsx`].find(existsSync);
      if (target) return loadModule(path.relative(path.resolve(__dirname, '..'), target), mocks, cache);
    }
    return nativeRequire(name);
  };
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  new Function('require', 'module', 'exports', outputText)(requireModule, module, module.exports);
  return module.exports;
}

const hooks = {
  ...React,
  useState: (initial) => [initial, () => {}],
  useEffect: () => {},
};
const native = {
  Modal: 'NativeModal', View: 'View', Text: 'Text', Pressable: 'Pressable',
  KeyboardAvoidingView: 'KeyboardAvoidingView', TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator', Platform: { OS: 'android' },
  StyleSheet: { create: (styles) => styles },
  Keyboard: { addListener: () => ({ remove() {} }), dismiss() {} },
};
function elements(tree) {
  if (!React.isValidElement(tree)) return [];
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(elements)];
}

function authFixture(storage = {}, authApi = {}) {
  const cache = new Map();
  let unauthorized;
  const mocks = {
    'expo-secure-store': { deleteItemAsync: async () => {}, getItemAsync: async () => 'key', setItemAsync: async () => {}, ...storage },
    '../services/api/config': { SECURE_STORE_KEYS: { ACCESS_TOKEN: 'token', USER_PROFILE: 'profile', BIOMETRIC_KEY: 'biometric' }, SECURE_STORE_OPTIONS: {} },
    '../services/api/endpoints/auth': authApi,
    '../services/api/endpoints/profile': {},
    '../services/api/client': { setTokenRefreshedCallback() {}, setUnauthorizedCallback(cb) { unauthorized = cb; } },
  };
  const { useAuthStore } = loadModule('src/store/auth-store.ts', mocks, cache);
  const { useUIStore } = loadModule('src/store/ui-store.ts', mocks, cache);
  useAuthStore.setState({ user: { id: 'alice', email: 'alice@example.com' }, accessToken: 'alice-token', isAuthenticated: true });
  return { auth: useAuthStore, ui: useUIStore, unauthorized: () => unauthorized() };
}

test('logout hides protected content before secure storage cleanup completes', async () => {
  let finishDelete;
  const pendingDelete = new Promise((resolve) => { finishDelete = resolve; });
  const { auth } = authFixture({ deleteItemAsync: () => pendingDelete });
  const logout = auth.getState().logout();
  try {
    assert.equal(auth.getState().isAuthenticated, false);
    assert.equal(auth.getState().user, null);
    assert.equal(auth.getState().accessToken, null);
  } finally {
    finishDelete();
    await logout;
  }
});

test('logout clears all modal and editing state before another account signs in', async () => {
  const { auth, ui } = authFixture();
  const state = ui.getState();
  state.openBudgetModal(); state.openMacroAssetModal(); state.openSweepModal();
  state.openCashFlowModal(); state.openNotificationModal();
  state.openCoreNetworkModal({ id: 'alice-network' });
  state.openCreditCardModal({ id: 'alice-card' });
  await auth.getState().logout();
  const after = ui.getState();
  for (const name of ['isBudgetModalOpen', 'isMacroAssetModalOpen', 'isSweepModalOpen', 'isCashFlowModalOpen', 'isNotificationModalOpen', 'isCoreNetworkModalOpen', 'isCreditCardModalOpen']) {
    assert.equal(after[name], false, name);
  }
  assert.equal(after.editingCoreNetwork, null);
  assert.equal(after.editingCreditCard, null);
});

test('session expiry preserves the account and open form for same-account unlock', () => {
  const { auth, ui, unauthorized } = authFixture();
  ui.getState().openCashFlowModal();
  unauthorized();
  assert.equal(auth.getState().isSessionLocked, true);
  assert.equal(auth.getState().user.id, 'alice');
  assert.equal(auth.getState().isAuthenticated, true);
  assert.equal(ui.getState().isCashFlowModalOpen, true);
});

test('an open shared modal disappears on lock without closing the draft', () => {
  const state = { isAuthenticated: true, isSessionLocked: false };
  let closes = 0;
  const useAuthStore = (select) => select ? select(state) : state;
  const mocks = {
    react: hooks, 'react-native': native,
    'lucide-react-native': { X: 'X' }, './toast': { default: 'Toast', __esModule: true },
    '../store/auth-store': { useAuthStore },
  };
  const { default: FlatModal } = loadModule('src/components/flat-modal.tsx', mocks);
  const props = { visible: true, onClose: () => closes++, title: 'Entry', children: 'unfinished entry' };
  const getNativeModal = () => {
    let element = FlatModal(props);
    // Resolve the shared session boundary if present, leaving platform rendering to RN.
    while (typeof element.type === 'function') element = element.type(element.props);
    return element;
  };
  assert.equal(getNativeModal().props.visible, true);
  state.isSessionLocked = true;
  assert.equal(getNativeModal().props.visible, false);
  assert.equal(closes, 0);
  state.isSessionLocked = false;
  assert.equal(getNativeModal().props.visible, true);
  state.isAuthenticated = false;
  assert.equal(getNativeModal().props.visible, false);
});

function layoutFixture(state) {
  const effects = [];
  const appStateListeners = new Set();
  const backListeners = new Set();
  const Stack = Object.assign(() => null, { Screen: 'Screen', Protected: 'Protected' });
  const modalNames = ['budget-config-modal', 'macro-asset-modal', 'core-network-modal', 'sweep-modal', 'cash-flow-modal', 'credit-card-modal', 'notification-modal'];
  const mocks = {
    '@/global.css': {}, react: { ...hooks, useState: () => [true, () => {}], useEffect: (effect) => effects.push(effect) },
    'react-native': { ...native, AppState: { addEventListener: (_event, listener) => {
      appStateListeners.add(listener);
      return { remove: () => appStateListeners.delete(listener) };
    } }, BackHandler: { addEventListener: (_event, listener) => {
      backListeners.add(listener);
      return { remove: () => backListeners.delete(listener) };
    } } }, 'expo-router': { Stack, useRouter: () => ({}), useSegments: () => ['luxury-checklist'] },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
    'expo-status-bar': { StatusBar: 'StatusBar' }, 'expo-linking': {},
    'react-native-gesture-handler': { GestureHandlerRootView: 'GestureHandlerRootView' },
    '../src/store/auth-store': { useAuthStore: () => state },
    '../src/hooks/usePushNotifications': { usePushNotifications() {} },
    '../src/hooks/useShakeToLock': { useShakeToLock() {} },
    '../src/components/toast': { default: 'Toast', __esModule: true },
    '../src/components/session-lock-screen': { default: 'SessionLockScreen', __esModule: true },
  };
  for (const name of modalNames) mocks[`../src/components/${name}`] = { default: name, __esModule: true };
  const { default: RootLayout } = loadModule('app/_layout.tsx', mocks);
  return { render: RootLayout, Stack, modalNames, effects, appStateListeners, backListeners };
}

test('logged-out navigation excludes both wishlist and tabs, with login as fallback', () => {
  const { render, Stack } = layoutFixture({ isAuthenticated: false, user: null });
  const stack = elements(render()).find((el) => el.type === Stack);
  function allowed(node) {
    if (!React.isValidElement(node) || (node.type === Stack.Protected && !node.props.guard)) return [];
    if (node.type === Stack.Screen) return [node.props.name];
    return React.Children.toArray(node.props.children).flatMap(allowed);
  }
  const routes = allowed(stack);
  assert.equal(routes.includes('luxury-checklist'), false);
  assert.equal(routes.includes('(tabs)'), false);
  assert.equal(stack.props.initialRouteName, 'login');
});

test('global form components remain mounted on lock and are removed on logout', () => {
  const state = { isAuthenticated: true, user: { id: 'alice' }, isSessionLocked: false };
  const { render, modalNames } = layoutFixture(state);
  state.isSessionLocked = true;
  const locked = elements(render());
  for (const name of modalNames) assert.equal(locked.some((el) => el.type === name), true, name);
  state.isAuthenticated = false;
  state.user = null;
  const loggedOut = elements(render());
  for (const name of modalNames) assert.equal(loggedOut.some((el) => el.type === name), false, name);
});

test('returning to the foreground checks expiry before the polling timer runs', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 1_000_000 });
  const token = `header.${Buffer.from('{"exp":1060}').toString('base64url')}.signature`;
  let locked = false;
  const fixture = layoutFixture({ isAuthenticated: true, accessToken: token, isSessionLocked: false, setSessionLocked: (value) => { locked = value; } });
  fixture.render();
  const cleanup = fixture.effects[1]();
  try {
    assert.equal(locked, false);
    // Native backgrounding can suspend timers; move wall time without executing them.
    t.mock.timers.setTime(1_061_000);
    for (const listener of fixture.appStateListeners) listener('active');
    assert.equal(locked, true);
  } finally {
    cleanup();
  }
  assert.equal(fixture.appStateListeners.size, 0);
});

test('locked navigation blocks touches, accessibility, and back gestures behind the overlay', () => {
  const { render, Stack } = layoutFixture({ isAuthenticated: true, user: { id: 'alice' }, isSessionLocked: true });
  const tree = elements(render());
  const background = tree.find((el) => el.type === native.View && elements(el).some((child) => child.type === Stack));
  assert.ok(background);
  assert.equal(background.props.pointerEvents, 'none');
  assert.equal(background.props.accessibilityElementsHidden, true);
  assert.equal(background.props.importantForAccessibility, 'no-hide-descendants');
  assert.equal(tree.find((el) => el.type === Stack).props.screenOptions.gestureEnabled, false);
  assert.equal(tree.some((el) => el.type === 'SessionLockScreen'), true);
});

test('Android Back is consumed while locked and the handler is removed on unlock', () => {
  const fixture = layoutFixture({ isAuthenticated: true, user: { id: 'alice' }, isSessionLocked: true });
  fixture.render();
  const cleanup = fixture.effects[3]();
  try {
    assert.equal(fixture.backListeners.size, 1);
    assert.equal([...fixture.backListeners][0](), true);
  } finally {
    cleanup?.();
  }
  assert.equal(fixture.backListeners.size, 0);
});

test('authenticated navigation has an available initial route', () => {
  const { render, Stack } = layoutFixture({ isAuthenticated: true, user: { id: 'alice' } });
  const stack = elements(render()).find((el) => el.type === Stack);
  assert.equal(stack.props.initialRouteName, '(tabs)');
});

test('account-owned navigation and forms have distinct keys that survive locking and change on account switch', () => {
  const state = { isAuthenticated: true, user: { id: 'alice' }, isSessionLocked: false };
  const { render, Stack } = layoutFixture(state);
  function accountKeys() {
    const tree = elements(render());
    const background = tree.find((el) => el.type === native.View && elements(el).some((child) => child.type === Stack));
    const children = React.Children.toArray(background.props.children);
    const stack = children.find((el) => el.type === Stack);
    const forms = children.find((el) => el.type === React.Fragment);
    assert.ok(stack);
    assert.ok(forms);
    assert.notEqual(stack.key, forms.key, 'navigation and forms are siblings and must not share a key');
    return { stack: stack.key, forms: forms.key };
  }

  const alice = accountKeys();
  state.isSessionLocked = true;
  assert.deepEqual(accountKeys(), alice, 'locking must preserve the same account draft');
  state.isSessionLocked = false;
  assert.deepEqual(accountKeys(), alice, 'unlocking must preserve the same account draft');
  state.user = { id: 'bob' };
  const bob = accountKeys();
  assert.notEqual(bob.stack, alice.stack, 'account switching must reset navigation');
  assert.notEqual(bob.forms, alice.forms, 'account switching must reset form state');
});

test('a biometric response arriving after disconnect cannot sign the user back in', async () => {
  let finishLogin;
  let loginStarted;
  const started = new Promise((resolve) => { loginStarted = resolve; });
  const response = new Promise((resolve) => { finishLogin = resolve; });
  const { auth } = authFixture({}, { apiBiometricLogin: () => { loginStarted(); return response; } });
  auth.getState().setSessionLocked(true);
  const unlock = auth.getState().biometricUnlock();
  await started;
  await auth.getState().logout();
  finishLogin({ data: { token: 'fresh-token', user: { id: 'alice', email: 'alice@example.com' } } });
  await unlock;
  assert.equal(auth.getState().isAuthenticated, false);
  assert.equal(auth.getState().accessToken, null);
});

test('a new login keeps its credentials when previous logout cleanup is slow', async () => {
  const stored = new Map([['token', 'alice-token'], ['profile', 'alice-profile']]);
  let finishDelete;
  const pendingDelete = new Promise((resolve) => { finishDelete = resolve; });
  const { auth } = authFixture({
    deleteItemAsync: async (key) => { await pendingDelete; stored.delete(key); },
    setItemAsync: async (key, value) => { stored.set(key, value); },
  }, { apiLogin: async () => ({ data: { token: 'bob-token', user: { id: 'bob', email: 'bob@example.com' } } }) });
  const logout = auth.getState().logout();
  const login = auth.getState().login({ email: 'bob@example.com', password: 'password' });
  // Let the login response arrive while the old logout is waiting on native storage.
  await new Promise(setImmediate);
  finishDelete();
  await Promise.all([logout, login]);
  assert.equal(auth.getState().user.id, 'bob');
  assert.equal(stored.get('token'), 'bob-token');
  assert.equal(JSON.parse(stored.get('profile')).id, 'bob');
});

test('same-account unlock keeps the open draft and refreshes authentication', async () => {
  const { auth, ui } = authFixture();
  ui.getState().openCashFlowModal();
  auth.getState().setSessionLocked(true);
  const unlocked = await auth.getState().completeSessionUnlock('fresh-token', { id: 'alice', email: 'alice@example.com' }, 'alice-token');
  assert.equal(unlocked, true);
  assert.equal(auth.getState().isSessionLocked, false);
  assert.equal(auth.getState().accessToken, 'fresh-token');
  assert.equal(ui.getState().isCashFlowModalOpen, true);
});

test('unlock refuses credentials for a different account and keeps the draft locked', async () => {
  const { auth, ui } = authFixture();
  ui.getState().openCashFlowModal();
  auth.getState().setSessionLocked(true);
  const unlocked = await auth.getState().completeSessionUnlock('bob-token', { id: 'bob', email: 'bob@example.com' }, 'alice-token');
  assert.equal(unlocked, false);
  assert.equal(auth.getState().isSessionLocked, true);
  assert.equal(auth.getState().user.id, 'alice');
});

test('disconnect during credential persistence clears the credentials after that write', async () => {
  const stored = new Map();
  let finishWrite;
  let writeStarted;
  const started = new Promise((resolve) => { writeStarted = resolve; });
  const pendingWrite = new Promise((resolve) => { finishWrite = resolve; });
  const { auth } = authFixture({
    setItemAsync: async (key, value) => { writeStarted(); await pendingWrite; stored.set(key, value); },
    deleteItemAsync: async (key) => { stored.delete(key); },
  });
  auth.getState().setSessionLocked(true);
  const unlock = auth.getState().completeSessionUnlock('fresh-token', { id: 'alice', email: 'alice@example.com' }, 'alice-token');
  await started;
  const logout = auth.getState().logout();
  finishWrite();
  assert.equal(await unlock, false);
  await logout;
  assert.equal(auth.getState().isAuthenticated, false);
  assert.equal(stored.size, 0);
});

test('switching accounts clears the previous account modal and editing references', async () => {
  const { auth, ui } = authFixture({}, { apiLogin: async () => ({ data: { token: 'bob-token', user: { id: 'bob', email: 'bob@example.com' } } }) });
  ui.getState().openCoreNetworkModal({ id: 'alice-network' });
  await auth.getState().login({ email: 'bob@example.com', password: 'password' });
  assert.equal(auth.getState().user.id, 'bob');
  assert.equal(ui.getState().isCoreNetworkModalOpen, false);
  assert.equal(ui.getState().editingCoreNetwork, null);
});
