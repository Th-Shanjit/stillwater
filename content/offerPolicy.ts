export type OfferPlatform =
  | 'android'
  | 'ios'
  | 'unsupported';

export interface OfferConfiguration {
  platform: OfferPlatform;
  androidEnabled: boolean;
  iosEnabled: boolean;
  legalReady: boolean;
  supportedBuild: boolean;
}

export function permitsOfferRedemption(
  config: OfferConfiguration
): boolean {
  if (!config.legalReady || !config.supportedBuild) {
    return false;
  }

  if (config.platform === 'android') {
    return config.androidEnabled;
  }

  if (config.platform === 'ios') {
    return config.iosEnabled;
  }

  return false;
}

export const OFFER_DISCLOSURES = [
  'Offers are issued through the applicable app store.',
  'Eligibility, duration and renewal terms depend on the offer.',
  'Some offers begin an automatically renewing subscription.',
  'Redeeming an offer does not confirm active Plus access.',
  'Refresh membership or restore purchases after redemption.',
] as const;
