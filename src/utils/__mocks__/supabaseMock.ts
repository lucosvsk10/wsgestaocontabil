
/**
 * Mock implementation of Supabase client for testing
 */
import { vi } from "vitest";

// Mock storage object
const storageMock = {
  from: (bucket: string) => ({
    upload: vi.fn().mockResolvedValue({ data: { path: 'test/file.pdf' }, error: null }),
    download: vi.fn().mockResolvedValue({ 
      data: new Blob(['test file content'], { type: 'application/pdf' }), 
      error: null 
    }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test/file.pdf' } })
  })
};

// Mock auth object
const authMock = {
  getSession: vi.fn().mockResolvedValue({ 
    data: { session: { user: { id: 'test-user-id', email: 'test@example.com' } } }, 
    error: null 
  }),
  signInWithPassword: vi.fn().mockResolvedValue({ 
    data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
    error: null 
  }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  onAuthStateChange: vi.fn().mockReturnValue({ 
    data: { subscription: { unsubscribe: vi.fn() } }
  }),
  mfa: {
    getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal1' },
      error: null
    }),
    listFactors: vi.fn().mockResolvedValue({
      data: { totp: [] },
      error: null
    })
  }
};

// Mock database query methods
const queryBuilderMock = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: vi.fn().mockResolvedValue({ data: [], error: null })
};

// Main Supabase mock
export const supabaseMock = {
  from: vi.fn().mockReturnValue(queryBuilderMock),
  storage: storageMock,
  auth: authMock,
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null })
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ id: 'test-channel' })
  }),
  removeChannel: vi.fn()
};

export default supabaseMock;
