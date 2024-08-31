export enum ModalType {
  Login = "login",
  SignUp = "signup",
}

export enum AuthStrategy {
  Google = "oauth_google",
  Facebook = "oauth_facebook",
  Metamask = "web3_wallet",
  Apple = "oauth_apple",
  EmailLink = "email_link", // Added for email link authentication
  EmailCode = "email_code", // Added for email code verification
  Passkey = "passkey", // Added for passkey authentication
  OTP = "otp", // One-time password, e.g., via SMS or email
}

export interface Board {
  id: string;
  creator: string;
  title: string;
  created_at: string;
  background: string;
  last_edit: null;
}

export interface TaskList {
  board_id: string;
  created_at: string;
  id: string;
  position: number;
  title: string;
}

export interface TaskListFake {
  id?: string;
}

export interface Task {
  id: string;
  list_id: number;
  board_id: number;
  position: number;
  title: string;
  description: string | null;
  assigned_to: string | null;
  done: boolean;
  image_url?: string;
  created_at: string;
  users?: User;
}

export interface User {
  avatar_url: string;
  email: string;
  first_name: string;
  id: string;
  username: null;
}
