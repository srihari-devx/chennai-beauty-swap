/// <reference types="vite/client" />

// Google Identity Services type declarations
interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string; select_by?: string }) => void;
    auto_select?: boolean;
    context?: string;
  }) => void;
  prompt: (callback?: (notification: {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    isDismissedMoment?: () => boolean;
    getMomentType?: () => string;
  }) => void) => void;
  renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
  disableAutoSelect: () => void;
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId;
    };
  };
}
