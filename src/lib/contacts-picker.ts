import { Platform } from 'react-native';

export type PickedContact = {
  name: string;
  phone: string | null;
};

type ContactsModule = typeof import('expo-contacts');

let contactsModule: ContactsModule | null | undefined;

async function loadContacts(): Promise<ContactsModule | null> {
  if (contactsModule !== undefined) return contactsModule;
  if (Platform.OS === 'web') {
    contactsModule = null;
    return null;
  }
  try {
    contactsModule = await import('expo-contacts');
    return contactsModule;
  } catch (e) {
    console.info('[contacts] unavailable — rebuild the native app:', e);
    contactsModule = null;
    return null;
  }
}

/** Opens the system contact picker and returns name + first phone. */
export async function pickContact(): Promise<PickedContact | null> {
  const Contacts = await loadContacts();
  if (!Contacts) {
    throw new Error('Contacts need a rebuilt Portl app. Run npx expo run:android.');
  }

  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Contacts permission is required to pick a guest.');
  }

  const contact = await Contacts.presentContactPickerAsync();
  if (!contact) return null;

  const name =
    contact.name?.trim() ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
    'Guest';

  const phone =
    contact.phoneNumbers?.find((p) => p.number?.trim())?.number?.trim() ?? null;

  return { name, phone };
}
