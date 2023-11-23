export type Exchanger = {
  name: string;
  deepLink: string;
  pairs: [string, string][];
  url?: string;
  tgContacts?: string[];
  emailContacts?: string[];
};
