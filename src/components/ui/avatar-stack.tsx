import { Text, View } from 'react-native';

import { InitialsAvatar } from '@/components/ui/brand';
import { Brand, FontFamily } from '@/constants/theme';

export type AvatarStackPerson = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

type Props = {
  people: AvatarStackPerson[];
  max?: number;
  size?: number;
};

/**
 * Overlapping avatar circles with +N overflow.
 * Extracted from PollVoterStack for reuse on assignees / members.
 */
export function AvatarStack({ people, max = 3, size = 28 }: Props) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  if (shown.length === 0) return null;

  return (
    <View className="flex-row items-center" style={{ minWidth: size * 1.5 }}>
      {shown.map((person, i) => (
        <View
          key={person.id}
          style={{ marginLeft: i === 0 ? 0 : -Math.round(size * 0.35), zIndex: shown.length - i }}
        >
          <InitialsAvatar
            name={person.name}
            seed={person.id}
            size={size}
            imageUrl={person.imageUrl}
          />
        </View>
      ))}
      {extra > 0 ? (
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: Brand.primarySoft,
            marginLeft: -Math.round(size * 0.35),
          }}
        >
          <Text
            className="font-bold"
            style={{
              color: Brand.primary,
              fontFamily: FontFamily.heading,
              fontSize: Math.max(9, size * 0.36),
            }}
          >
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
