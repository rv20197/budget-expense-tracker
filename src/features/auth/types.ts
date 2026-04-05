export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
};
