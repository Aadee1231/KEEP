import { Redirect } from 'expo-router';
import { useSession } from '../src/data/provider';
import { Loading, Screen } from '../src/ui';

export default function Index() {
  const { status } = useSession();
  if (status === 'ready') return <Redirect href="/(tabs)" />;
  if (status === 'onboarding') return <Redirect href="/onboarding" />;
  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  return (
    <Screen>
      <Loading />
    </Screen>
  );
}
