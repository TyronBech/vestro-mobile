import React, { memo, useId, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { CreditCard as CardIcon } from 'lucide-react-native';
import VisaIcon from '../../assets/svgs/visa.svg';
import MastercardIcon from '../../assets/svgs/mastercard.svg';
import type { BankCardTheme } from './bank-card-theme';

const CARD_INK = '#ffffff';
const CARD_MUTED = '#d0d6df';

const CardArtwork = memo(function CardArtwork({ theme }: { theme: BankCardTheme }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const fillId = `finish-${id}`;
  const glowId = `glow-${id}`;
  const sheenId = `sheen-${id}`;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 360 240"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
    >
      <Defs>
        <LinearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0" stopColor={theme.raised} />
          <Stop offset="0.5" stopColor={theme.base} />
          <Stop offset="1" stopColor={theme.deep} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="100%" cy="10%" rx="85%" ry="95%">
          <Stop offset="0" stopColor={theme.accent} stopOpacity="0.7" />
          <Stop offset="0.55" stopColor={theme.accent} stopOpacity="0.13" />
          <Stop offset="1" stopColor={theme.accent} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={sheenId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
          <Stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0.035" />
        </LinearGradient>
      </Defs>
      <Rect width="360" height="240" fill={`url(#${fillId})`} />
      <Rect width="360" height="240" fill={`url(#${glowId})`} />

      <G transform={`translate(${theme.offset / 2}, 0)`}>
        {theme.pattern === 'contour' && (
          <>
            <Path d="M190 -30 C360 25 175 125 390 180 L390 -30Z" fill={theme.accent} opacity="0.19" />
            {Array.from({ length: 12 }, (_, index) => (
              <Path
                key={index}
                d={`M${190 + index * 8} -30 C${380 + index * 7} 38 ${150 + index * 6} 130 ${360 + index * 8} 225`}
                stroke={theme.highlight}
                strokeWidth={index % 4 === 0 ? 1 : 0.5}
                opacity={index % 4 === 0 ? 0.28 : 0.12}
                fill="none"
              />
            ))}
          </>
        )}
        {theme.pattern === 'ribbon' && (
          <>
            <Path d="M220 -40 C150 65 400 65 290 280 L405 280 C470 80 240 70 340 -40Z" fill={theme.accent} opacity="0.19" />
            {Array.from({ length: 10 }, (_, index) => (
              <Path
                key={index}
                d={`M${238 + index * 9} -30 C${150 + index * 7} 65 ${395 + index * 8} 85 ${285 + index * 9} 270`}
                stroke={theme.highlight}
                strokeWidth="0.65"
                opacity="0.2"
                fill="none"
              />
            ))}
          </>
        )}
        {theme.pattern === 'orbit' && (
          <>
            <Circle cx="345" cy="75" r="116" fill={theme.accent} opacity="0.1" />
            {Array.from({ length: 11 }, (_, index) => (
              <Circle
                key={index}
                cx="345"
                cy="75"
                r={62 + index * 12}
                stroke={theme.highlight}
                strokeWidth={index % 3 === 0 ? 1 : 0.5}
                opacity={index % 3 === 0 ? 0.23 : 0.1}
                fill="none"
              />
            ))}
          </>
        )}
        {theme.pattern === 'facets' && (
          <>
            <Path d="M175 0H360V240L270 175Z" fill={theme.accent} opacity="0.15" />
            <Path d="M265 0L360 100V240L210 95Z" fill={theme.highlight} opacity="0.045" />
            {Array.from({ length: 11 }, (_, index) => (
              <Path
                key={index}
                d={`M${190 + index * 13} -20 L${355 + index * 13} 155 L${275 + index * 13} 260`}
                stroke={theme.highlight}
                strokeWidth="0.65"
                opacity="0.18"
                fill="none"
              />
            ))}
          </>
        )}
      </G>

      <Path d="M0 200 C110 145 225 280 360 165" stroke={theme.highlight} strokeWidth="0.6" opacity="0.12" fill="none" />
      <Rect width="360" height="240" fill={`url(#${sheenId})`} />
      <Rect x="5" y="5" width="350" height="230" rx="15" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="0.75" fill="none" />
    </Svg>
  );
});

export function BankCardSurface({
  theme,
  children,
  style,
}: {
  theme: BankCardTheme;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[cardStyles.surface, { backgroundColor: theme.base }, style]}>
      <CardArtwork theme={theme} />
      <View style={cardStyles.content}>{children}</View>
    </View>
  );
}

function BankLogo({ url, name }: { url?: string | null; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedSize, setLoadedSize] = useState({ url: '', ratio: 1 });
  const ratio = loadedSize.url === url ? loadedSize.ratio : 1;
  const logoWidth = Math.min(144, Math.max(28, 28 * ratio));

  return (
    <View style={cardStyles.bankLogo} accessible accessibilityLabel={name}>
      {url && failedUrl !== url ? (
        <Image
          key={url}
          source={{ uri: url }}
          style={{ width: logoWidth, maxWidth: '100%', height: 28, flexShrink: 1 }}
          resizeMode="contain"
          onError={() => setFailedUrl(url)}
          onLoad={({ nativeEvent }) => {
            const { width, height } = nativeEvent.source;
            if (width > 0 && height > 0) setLoadedSize({ url, ratio: width / height });
          }}
          accessible={false}
        />
      ) : (
        <>
          <CardIcon size={20} color={CARD_INK} strokeWidth={1.5} />
          <Text numberOfLines={1} style={[cardStyles.bankName, cardStyles.identityCopy]}>{name}</Text>
        </>
      )}
    </View>
  );
}

export function BankCardIdentity({
  name,
  detail,
  iconUrl,
  vestro = false,
}: {
  name: string;
  detail?: string;
  iconUrl?: string | null;
  vestro?: boolean;
}) {
  if (!vestro) return <BankLogo url={iconUrl} name={name} />;

  return (
    <View style={cardStyles.identity}>
      <View style={cardStyles.vestroMark}>
        <Text style={cardStyles.vestroLetter}>V</Text>
      </View>
      <View style={cardStyles.identityCopy}>
        <Text numberOfLines={1} style={cardStyles.bankName}>{name}</Text>
        {detail ? <Text numberOfLines={1} style={cardStyles.identityDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

export function CardChip() {
  const id = `chip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <View style={cardStyles.chipGroup} pointerEvents="none" accessible={false}>
      <Svg width={38} height={30} viewBox="0 0 38 30">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor="#f0dfad" />
            <Stop offset="0.38" stopColor="#c2a567" />
            <Stop offset="0.62" stopColor="#eeddb1" />
            <Stop offset="1" stopColor="#a78c52" />
          </LinearGradient>
        </Defs>
        <Rect x="0.5" y="0.5" width="37" height="29" rx="6" fill={`url(#${id})`} stroke="#f5e6be" strokeOpacity="0.65" />
        <Rect x="12" y="8" width="14" height="14" rx="4" stroke="#846d3f" strokeWidth="0.8" fill="none" />
        <Path d="M12 1V8 M26 1V8 M12 22V29 M26 22V29 M1 10H12 M1 20H12 M26 10H37 M26 20H37 M1 15H12 M26 15H37" stroke="#846d3f" strokeWidth="0.8" fill="none" />
        <Path d="M13 9L25 21 M13 21L25 9" stroke="#fff5d7" strokeOpacity="0.15" fill="none" />
      </Svg>
      <Svg width={16} height={22} viewBox="0 0 16 22">
        <Path d="M3 8Q6 11 3 14 M6 5Q12 11 6 17 M9 2Q18 11 9 20" stroke={CARD_INK} strokeOpacity="0.65" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

export function CardAmount({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={cardStyles.amountRow}>
      <View style={cardStyles.amountCopy}>
        <Text style={cardStyles.label}>{label}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={cardStyles.amount}>{value}</Text>
        {note ? <Text numberOfLines={1} style={cardStyles.paymentNote}>{note}</Text> : null}
      </View>
      <CardChip />
    </View>
  );
}

export function CardNumber() {
  return (
    <Text style={cardStyles.cardNumber} numberOfLines={1} adjustsFontSizeToFit accessible={false}>
      •••• •••• •••• ••••
    </Text>
  );
}

export function CardNetwork({
  brand = 'VISA',
  onPress,
}: {
  brand?: 'VISA' | 'MASTERCARD';
  onPress?: () => void;
}) {
  const logo = brand === 'MASTERCARD'
    ? <MastercardIcon width={44} height={28} />
    : <VisaIcon width={50} height={17} />;

  return onPress ? (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Card network: ${brand === 'VISA' ? 'Visa' : 'Mastercard'}. Tap to switch`}
      style={cardStyles.networkButton}
    >
      {logo}
    </TouchableOpacity>
  ) : (
    <View accessibilityLabel={brand === 'VISA' ? 'Visa' : 'Mastercard'} style={cardStyles.network}>
      {logo}
    </View>
  );
}

export function CardHolder({ name, detail }: { name?: string | null; detail?: string }) {
  return (
    <View style={cardStyles.holderCopy}>
      <Text numberOfLines={1} style={cardStyles.label}>{detail || 'Cardholder'}</Text>
      <Text numberOfLines={1} style={cardStyles.holderName}>{name?.trim() || 'Vestro Member'}</Text>
    </View>
  );
}

export const cardStyles = StyleSheet.create({
  surface: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff26',
    overflow: 'hidden',
  },
  content: { flex: 1, paddingHorizontal: 20, paddingVertical: 18, justifyContent: 'space-between', gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  identityCopy: { flex: 1, minWidth: 0 },
  bankName: { color: CARD_INK, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  identityDetail: { color: CARD_MUTED, fontSize: 8, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 3 },
  bankLogo: { flex: 1, minWidth: 0, height: 32, flexDirection: 'row', alignItems: 'center', gap: 10 },
  vestroMark: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#ee4e4320', borderWidth: 1, borderColor: '#ee4e4360', alignItems: 'center', justifyContent: 'center' },
  vestroLetter: { color: '#ff928a', fontSize: 19, fontWeight: '800', fontStyle: 'italic' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amountCopy: { flex: 1, minWidth: 0 },
  label: { color: CARD_MUTED, fontSize: 8, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase' },
  amount: { color: CARD_INK, fontSize: 32, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'], marginTop: 4 },
  paymentNote: { color: '#a6e6c9', fontSize: 9, fontWeight: '600', marginTop: 3 },
  chipGroup: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  cardNumber: { color: '#ffffffb8', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 2.5, fontWeight: '500' },
  footer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  holderCopy: { flex: 1, minWidth: 0 },
  holderName: { color: CARD_INK, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 5 },
  network: { width: 52, height: 30, justifyContent: 'center', alignItems: 'flex-end', flexShrink: 0 },
  networkButton: { width: 56, height: 44, marginVertical: -7, justifyContent: 'center', alignItems: 'flex-end', flexShrink: 0 },
});
