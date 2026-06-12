export const BURST_MEMBER_INFIX = '.burst.';

export const getBurstMemberPlainName = (repPlainName: string, index: number): string =>
  `${repPlainName}${BURST_MEMBER_INFIX}${index}`;

const BURST_MEMBER_PATTERN = /\.burst\.\d+$/;

export const isBurstMemberPlainName = (plainName: string): boolean => BURST_MEMBER_PATTERN.test(plainName);

export const getRepresentativePlainNameFromMember = (memberPlainName: string): string =>
  memberPlainName.replace(BURST_MEMBER_PATTERN, '');
