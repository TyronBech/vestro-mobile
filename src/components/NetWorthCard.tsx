import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import {
  BankCardIdentity,
  BankCardSurface,
  CardAmount,
  CardHolder,
  CardNetwork,
  CardNumber,
  cardStyles,
} from './bank-card';
import { bankCardHeight, createBankCardTheme } from './bank-card-theme';

interface Props {
  balance: string;
  showBalance: boolean;
  cardholderName?: string | null;
  cardBrand: 'VISA' | 'MASTERCARD';
  onToggleBalance: () => void;
  onToggleBrand: () => void;
}

export function NetWorthCard({
  balance,
  showBalance,
  cardholderName,
  cardBrand,
  onToggleBalance,
  onToggleBrand,
}: Props) {
  const { fontScale } = useWindowDimensions();
  const theme = useMemo(() => ({
    ...createBankCardTheme(Colors.actionPrimary, 'vestro'),
    base: '#1c1d23',
    raised: '#323038',
    deep: '#111217',
    pattern: 'contour' as const,
  }), []);

  return (
    <View style={[styles.card, { height: bankCardHeight('standard', fontScale) }]}>
      <BankCardSurface theme={theme}>
        <View style={cardStyles.header}>
          <BankCardIdentity name="VESTRO" detail="Personal finance" vestro />
          <TouchableOpacity
            onPress={onToggleBalance}
            accessibilityRole="button"
            accessibilityLabel={showBalance ? 'Hide balances' : 'Show balances'}
            style={styles.visibilityButton}
          >
            {showBalance ? <Eye size={18} color="#ffffff" /> : <EyeOff size={18} color="#ffffff" />}
          </TouchableOpacity>
        </View>
        <CardAmount label="Net worth" value={showBalance ? balance : '••••••••'} />
        <CardNumber />
        <View style={cardStyles.footer}>
          <CardHolder name={cardholderName} />
          <CardNetwork brand={cardBrand} onPress={onToggleBrand} />
        </View>
      </BankCardSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 20 },
  visibilityButton: { width: 44, height: 44, marginRight: -8, marginVertical: -6, alignItems: 'center', justifyContent: 'center' },
});
