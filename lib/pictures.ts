// Pictures instead of PINs. The first 16 are used for join codes; all 64 for recovery.
export const PICTURES: [string, string][] = [
  ["🐘", "elephant"], ["🌻", "sunflower"], ["🏠", "house"], ["🚲", "bicycle"], ["🌙", "moon"], ["🍎", "apple"], ["🐟", "fish"], ["⭐", "star"],
  ["☂️", "umbrella"], ["🔑", "key"], ["🐄", "cow"], ["🌳", "tree"], ["🚗", "car"], ["⚽", "ball"], ["🎈", "balloon"], ["🦜", "parrot"],
  ["🐶", "dog"], ["🐱", "cat"], ["🐭", "mouse"], ["🐰", "rabbit"], ["🦊", "fox"], ["🐻", "bear"], ["🐼", "panda"], ["🐯", "tiger"],
  ["🦁", "lion"], ["🐸", "frog"], ["🐵", "monkey"], ["🐔", "hen"], ["🐧", "penguin"], ["🐢", "turtle"], ["🐝", "bee"], ["🦋", "butterfly"],
  ["🌹", "rose"], ["🌵", "cactus"], ["🍀", "clover"], ["🍁", "leaf"], ["🍄", "mushroom"], ["🌽", "corn"], ["🥕", "carrot"], ["🍌", "banana"],
  ["🍇", "grapes"], ["🍉", "watermelon"], ["🍋", "lemon"], ["🍒", "cherry"], ["🥥", "coconut"], ["🍞", "bread"], ["🧀", "cheese"], ["🥚", "egg"],
  ["☕", "tea"], ["🎂", "cake"], ["🔔", "bell"], ["📚", "books"], ["✏️", "pencil"], ["🎸", "guitar"], ["🥁", "drum"], ["🎁", "gift"],
  ["⏰", "clock"], ["💡", "bulb"], ["🔦", "torch"], ["🧭", "compass"], ["⛵", "boat"], ["✈️", "plane"], ["🚂", "train"], ["🏀", "basketball"],
];
export const JOIN_PICTURES = PICTURES.slice(0, 16);
export const RECOVERY_LENGTH = 12;
