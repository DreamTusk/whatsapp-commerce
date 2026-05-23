declare global {
  namespace Express {
    interface Request {
      user?: { userId: string };
      customer?: { customerId: string; storeId: string; phone: string };
    }
  }
}

export {};
