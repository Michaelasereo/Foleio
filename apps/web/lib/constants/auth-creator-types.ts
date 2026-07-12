export const AUTH_CREATOR_TYPES = [
  { value: 'content_creator', label: 'Content Creator' },
  { value: 'photography', label: 'Photographer' },
  { value: 'makeup', label: 'Makeup Artist' },
  { value: 'fashion', label: 'Fashion Creator' },
  { value: 'music', label: 'Musician' },
] as const;

export type AuthCreatorType = (typeof AUTH_CREATOR_TYPES)[number]['value'];

export const DEFAULT_AUTH_CREATOR_TYPE: AuthCreatorType = 'content_creator';
