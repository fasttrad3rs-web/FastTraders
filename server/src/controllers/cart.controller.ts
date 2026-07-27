import type { Request, Response } from 'express';
import * as cartService from '../services/cart.service';
import { hydrateCart } from '../services/cart.view';
import { cartOwner, ensureSessionId } from '../services/session.service';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import type { CartType } from '../types';
import type { AddCartItemInput, UpdateCartItemInput } from '../validators';

/**
 * Controllers for both carts. The route layer binds `type`, so
 * `/cart/items` and `/inquiry/items` share one implementation.
 */

function owner(req: Request, res: Response): cartService.CartOwner {
  // Guests get a session cookie on first touch; signed-in users never need one.
  const sessionId = req.user ? null : ensureSessionId(req, res);
  return cartOwner(req, sessionId);
}

export interface CartController {
  get: (req: Request, res: Response) => Promise<void>;
  add: (req: Request, res: Response) => Promise<void>;
  update: (req: Request, res: Response) => Promise<void>;
  remove: (req: Request, res: Response) => Promise<void>;
  clear: (req: Request, res: Response) => Promise<void>;
}

export function makeCartController(type: CartType): CartController {
  const noun = type === 'shopping' ? 'Cart' : 'Inquiry list';

  return {
    get: async (req: Request, res: Response): Promise<void> => {
      const cart = await cartService.getOrCreateCart(owner(req, res), type);
      sendSuccess(res, await hydrateCart(cart), `${noun} contents`);
    },

    add: async (req: Request, res: Response): Promise<void> => {
      const input = req.body as AddCartItemInput;
      const cart = await cartService.addItem(owner(req, res), type, input);
      sendCreated(res, await hydrateCart(cart), `Added to your ${noun.toLowerCase()}`);
    },

    update: async (req: Request, res: Response): Promise<void> => {
      const { productId } = req.params as { productId: string };
      const { variant } = req.query as { variant?: string };
      const patch = req.body as UpdateCartItemInput;

      const cart = await cartService.updateItem(owner(req, res), type, productId, {
        ...patch,
        ...(variant ? { variant } : {}),
      });
      sendSuccess(res, await hydrateCart(cart), `${noun} updated`);
    },

    remove: async (req: Request, res: Response): Promise<void> => {
      const { productId } = req.params as { productId: string };
      const { variant } = req.query as { variant?: string };

      const cart = await cartService.removeItem(owner(req, res), type, productId, variant);
      sendSuccess(res, await hydrateCart(cart), `Removed from your ${noun.toLowerCase()}`);
    },

    clear: async (req: Request, res: Response): Promise<void> => {
      const cart = await cartService.clearCart(owner(req, res), type);
      sendSuccess(res, await hydrateCart(cart), `${noun} emptied`);
    },
  };
}

export const shoppingCartController = makeCartController('shopping');
export const inquiryCartController = makeCartController('inquiry');
