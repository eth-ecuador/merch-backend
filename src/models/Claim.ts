import mongoose, { Schema, Document } from 'mongoose';

export interface IClaim extends Document {
  code: string;
  eventId: string;
  eventName: string;
  tokenURI: string;
  status: 'available' | 'reserved' | 'used';
  reservedBy?: string;
  reservationType?: 'wallet' | 'email';
  reservationId?: string;
  reservedAt?: Date;
  usedBy?: string;
  usedAt?: Date;
  txHash?: string;
  createdAt: Date;
  expiresAt: Date;
  metadata?: any;
}

const ClaimSchema = new Schema<IClaim>({
  code: { type: String, required: true, unique: true, index: true },
  eventId: { type: String, required: true, index: true },
  eventName: { type: String, required: true },
  tokenURI: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['available', 'reserved', 'used'], 
    default: 'available',
    index: true
  },
  reservedBy: { type: String },
  reservationType: { type: String, enum: ['wallet', 'email'] },
  reservationId: { type: String, unique: true, sparse: true },
  reservedAt: { type: Date },
  usedBy: { type: String, index: true },
  usedAt: { type: Date },
  txHash: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  metadata: { type: Schema.Types.Mixed }
});

export const Claim = mongoose.model<IClaim>('Claim', ClaimSchema);