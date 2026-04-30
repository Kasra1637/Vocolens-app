import { Image } from 'react-native';
import { YStack, Card, Button, H2, Paragraph } from '@blinkdotnew/mobile-ui';

export default function Home() {
  return (
    <YStack flex={1} backgroundColor="$color2" justifyContent="center" padding="$5">
      <Card elevation={4} bordered maxWidth={400} alignSelf="center" width="100%">
        <Card.Header padded>
          <YStack alignItems="center" gap="$3">
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            />
            <H2 textAlign="center">Welcome to Blink!</H2>
            <Paragraph color="$color10" textAlign="center">
              Let's start developing your mobile app
            </Paragraph>
          </YStack>
        </Card.Header>
        <Card.Footer padded>
          <Button theme="active" width="100%" onPress={() => console.log('Get Started!')}>
            Get Started
          </Button>
        </Card.Footer>
      </Card>
    </YStack>
  );
}
