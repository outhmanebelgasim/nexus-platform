export interface Farm {
  id: number;
  name: string;
  location: string | null;
  description: string | null;
  googleMapsUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FarmPayload {
  name: string;
  location?: string | null;
  description?: string | null;
  googleMapsUrl?: string | null;
}
