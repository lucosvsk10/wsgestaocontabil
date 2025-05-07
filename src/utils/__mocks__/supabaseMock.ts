
/**
 * Mock implementation of Supabase client for testing
 */

// Mock storage object
const storageMock = {
  from: (bucket: string) => ({
    upload: jest.fn().mockResolvedValue({ data: { path: 'test/file.pdf' }, error: null }),
    download: jest.fn().mockResolvedValue({ 
      data: new Blob(['test file content'], { type: 'application/pdf' }), 
      error: null 
    }),
    remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test/file.pdf' } })
  })
};

// Mock auth object
const authMock = {
  getSession: jest.fn().mockResolvedValue({ 
    data: { session: { user: { id: 'test-user-id', email: 'test@example.com' } } }, 
    error: null 
  }),
  signInWithPassword: jest.fn().mockResolvedValue({ 
    data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
    error: null 
  }),
  signOut: jest.fn().mockResolvedValue({ error: null }),
  onAuthStateChange: jest.fn().mockReturnValue({ 
    data: { subscription: { unsubscribe: jest.fn() } }
  }),
  mfa: {
    getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal1' },
      error: null
    }),
    listFactors: jest.fn().mockResolvedValue({
      data: { totp: [] },
      error: null
    })
  }
};

// Mock database query methods
const queryBuilderMock = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn().mockResolvedValue({ data: [], error: null })
};

// Main Supabase mock
export const supabaseMock = {
  from: jest.fn().mockReturnValue(queryBuilderMock),
  storage: storageMock,
  auth: authMock,
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: { success: true }, error: null })
  },
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnValue({ id: 'test-channel' })
  }),
  removeChannel: jest.fn()
};

export default supabaseMock;
