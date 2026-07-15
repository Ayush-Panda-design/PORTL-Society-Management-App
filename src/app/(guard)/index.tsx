import { Redirect } from 'expo-router';

export default function GuardIndex() {
  return <Redirect href="/(guard)/dashboard" />;
}
