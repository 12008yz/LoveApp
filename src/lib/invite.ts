import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const generateInviteCode = customAlphabet(alphabet, 8);
