import { Request, Response, NextFunction } from 'express';

export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    // ✅ CORREGIDO: Usar "error" en lugar de "message" según spec
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }
  
  next();
}
