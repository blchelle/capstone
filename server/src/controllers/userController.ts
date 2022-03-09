import argon2 from 'argon2';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import APIError from '../errors/apiError';

import { createJWT } from '../middlewares/authMiddleware';
import {
  validateSignupInput,
  signupUser,
  validateLoginInput,
  sanitizeUserOutput,
  validateSendResetPasswordInput,
  createResetPasswordToken,
  validateResetPasswordInput,
  resetPassword,
} from '../models/user';
import sendResetPasswordEmail from '../utils/mailer';

export const handleSignupUser = async (req: Request, res: Response) => {
  const { body } = req;

  await validateSignupInput(body);

  const { email, username, password } = body;
  const hashedPassword = await argon2.hash(password);
  const inputUser = { email, username, password: hashedPassword };

  const newUser = await signupUser(inputUser);

  createJWT(newUser.id, res);
  res.status(StatusCodes.CREATED).json({ data: sanitizeUserOutput(newUser), errors: [] });
};

export const handleLoginUser = async (req: Request, res: Response) => {
  const { body } = req;

  const user = await validateLoginInput(body);

  const { password } = body;
  const passwordMatches = await argon2.verify(user.password, password);
  if (!passwordMatches) {
    const error = { field: 'password', input: password, message: 'does not match for user' };
    throw new APIError('unauthorized', StatusCodes.UNAUTHORIZED, [error]);
  }

  createJWT(user.id, res);
  res.status(StatusCodes.OK).json(
    { data: sanitizeUserOutput(user), errors: [] },
  );
};

export const handleResetPasswordEmail = async (req: Request, res: Response) => {
  const { body } = req;

  const user = await validateSendResetPasswordInput(body);
  const token = await createResetPasswordToken(user);

  await sendResetPasswordEmail(user.email, token.id);

  res.status(StatusCodes.OK).end();
};

export const handleResetPassword = async (req: Request, res: Response) => {
  const { body } = req;

  const resetToken = await validateResetPasswordInput(body);

  const { password } = body;
  await resetPassword(resetToken, password);

  res.status(StatusCodes.ACCEPTED).end();
};
