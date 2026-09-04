export interface Reaction {
  userId: string;
  emoji: string;
}

export interface ReplyTo {
  messageId: string;
  senderId: string;
  senderName: string;
  text?: string;
  messageType: string;
  imageUrl?: string;
}

export interface Message {
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  image?: {
    url: string;
    publicId: string;
  };
  audio?: {
    url: string;
    publicId?: string;
    duration?: number;
  };
  messageType: 'text' | 'image' | 'audio';
  replyTo?: ReplyTo;
  reactions?: Reaction[];
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
  deletedForUsers?: string[];
  isEdited?: boolean;
  editedAt?: string | null;
  seen: boolean;
  seenAt: string | null;
  createdAt: string;
}
