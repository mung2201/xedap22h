import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';
export const ResponseMessage = (
  message: string,
): ReturnType<typeof SetMetadata> => SetMetadata(RESPONSE_MESSAGE_KEY, message);
