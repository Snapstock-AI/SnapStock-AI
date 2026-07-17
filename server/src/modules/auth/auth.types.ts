export interface RegisterDTO {
  full_name: string;
  email: string;
  password: string;
  nic?: string;
  date_of_birth?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  password: string;
}

export interface ResendVerificationDTO {
  email: string;
}

export interface EmailVerificationToken {
  user_id: string;
  token: string;
  expires_at: Date;
}
