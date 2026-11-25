import {
  createContext,
  useContext,
} from 'react';

import {
  Modal,
  type ModalProps,
} from 'react-native';

export const PrivacyCoverContext =
  createContext(true);

export function usePrivacyCovered() {
  return useContext(PrivacyCoverContext);
}

export function PrivacyModal(props: ModalProps) {
  const covered = usePrivacyCovered();

  // Unmount separate native modal windows
  // whenever the private interface is covered.
  if (covered) return null;

  return <Modal {...props} />;
}
