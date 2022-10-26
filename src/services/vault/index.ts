import Conf from 'conf'

export const SESSION_TOKEN_KEY_NAME = 'sessionToken'

const doNothing = () => {}

interface IVaultSetterGetter {
  clear: () => void
  get(key: string): string
  set(key: string, value: string): void
}

class VaultService {
  private readonly storer: IVaultSetterGetter

  constructor(storer: IVaultSetterGetter) {
    this.storer = storer
  }

  public clear = (): void => {
    this.storer.clear()
  }

  public get = (key: string): string | null => {
    return this.storer.get(key)
  }

  public set = (key: string, value: string): void => {
    this.storer.set(key, value)
  }
}

const testStore = new Map()
const testStorer: IVaultSetterGetter = {
  clear: doNothing,
  get: (key: string): string => {
    return testStore.get(key)
  },
  set: (key: string, value: string): void => {
    testStore.set(key, value)
  },
}

const credentialConf = new Conf<{ token: string }>({
  cwd: `${process.env.HOME}/.affinidi/credentials`,
})

const storer: IVaultSetterGetter = {
  clear: (): void => {
    credentialConf.clear()
  },
  get: (key: string): string => {
    return credentialConf.get(key)
  },
  set: (key: string, value: string): void => {
    credentialConf.set(key, value)
  },
}

export const vaultService = new VaultService(process.env.NODE_ENV === 'test' ? testStorer : storer)