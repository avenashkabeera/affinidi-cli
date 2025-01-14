import Conf from 'conf'
import * as os from 'os'
import * as path from 'path'

import { NoConfigFile, NoUserConfigFound } from '../../errors'
import { version } from '../../constants'
import { vaultService } from '../vault/typedVaultService'

export const validVersions = [1]

export const getMajorVersion = (): number => {
  return version
}

type UserId = string

type UserConfig = {
  activeProjectId: string
  outputFormat: string
  analyticsOptIn?: boolean
}

type ConfigStoreFormat = {
  username: string
  version: number
  currentUserId: string
  configs: Record<UserId, UserConfig>
}

interface IConfigStorer {
  save(params: ConfigStoreFormat): void
  clear(): void
  setOutputFormat(outputFormat: string): void
  getUsername: () => string
  getVersion: () => number
  getCurrentUser: () => string
  getAllUserConfigs: () => Record<UserId, UserConfig>
  getOutputFormat: () => string
  setCurrentProjectId: (id: string) => void
  setCurrentUserId: (id: string) => void
  setUsername: (username: string) => void
  deleteUserConfig: () => void
}

class ConfigService {
  private readonly store: IConfigStorer

  constructor(store: IConfigStorer) {
    this.store = store
  }

  public clear = (): void => {
    this.store.clear()
  }

  public getVersion = (): number => {
    return this.store.getVersion()
  }

  public show = (): ConfigStoreFormat => {
    const currentUserId = this.getCurrentUser()
    const configVersion = this.store.getVersion()
    const configs = this.store.getAllUserConfigs()
    const username = this.store.getUsername()
    return { version: configVersion, currentUserId, configs, username }
  }

  public userConfigMustBeValid = (userId: string): boolean => {
    const configs = this.store.getAllUserConfigs()
    if (!configs) return false
    const userConfig = configs[userId]
    if (userConfig?.analyticsOptIn === undefined || !userConfig?.activeProjectId) {
      return false
    }
    return true
  }

  private readonly userConfigMustExist = (): void => {
    this.configFileMustExist()
    const userId = this.getCurrentUser() || vaultService.getSession()?.account.userId
    const configs = this.store.getAllUserConfigs()
    if (!configs || !(userId in configs)) {
      throw new Error(NoUserConfigFound)
    }
  }

  private readonly configFileMustExist = (): void => {
    const versionConf = this.store.getVersion()
    if (versionConf === null || versionConf === undefined) {
      throw new Error(NoConfigFile)
    }
  }

  private readonly configFileExists = (): boolean => {
    try {
      this.configFileMustExist()
      return true
    } catch (error) {
      return false
    }
  }

  public getCurrentUser = (): string => {
    return this.store.getCurrentUser()
  }

  public getOutputFormat = (): string => {
    return this.store.getOutputFormat()
  }

  public getUsername = (): string => {
    return this.store.getUsername()
  }

  public create = (
    userId: string,
    activeProjectId: string = '',
    analyticsOptIn: boolean | undefined = undefined,
  ): void => {
    this.store.save({
      currentUserId: userId,
      version: getMajorVersion(),
      username: '',
      configs: {
        [userId]: {
          activeProjectId,
          outputFormat: 'plaintext',
          analyticsOptIn,
        },
      },
    })
  }

  public updateConfigs = (
    userId: string,
    analyticsOptIn: boolean | undefined = undefined,
  ): Record<UserId, UserConfig> => {
    const configs = this.store.getAllUserConfigs()
    if (!configs[userId]) {
      configs[userId] = {
        activeProjectId: '',
        outputFormat: 'plaintext',
        analyticsOptIn,
      }
    } else {
      const userConfig = configs[userId]
      configs[userId] = {
        activeProjectId: userConfig.activeProjectId || '',
        outputFormat: userConfig.outputFormat || 'plaintext',
        analyticsOptIn: userConfig.analyticsOptIn || analyticsOptIn || false,
      }
    }
    return configs
  }

  public createOrUpdate = (
    userId: string,
    analyticsOptIn: boolean | undefined = undefined,
  ): void => {
    let configs = this.store.getAllUserConfigs()
    if (!this.configFileExists() || !configs) {
      this.create(userId, '', analyticsOptIn)
      return
    }

    configs = this.updateConfigs(userId, analyticsOptIn)
    this.store.save({
      currentUserId: userId,
      version: getMajorVersion(),
      username: this.getUsername(),
      configs,
    })
  }

  public setOutputFormat = (format: string): void => {
    this.userConfigMustExist()
    this.store.setOutputFormat(format)
  }

  public currentUserConfig = (): UserConfig => {
    const user = this.store.getCurrentUser()
    const configs = this.store.getAllUserConfigs()
    if (!configs[user]) {
      throw Error(NoUserConfigFound)
    }
    return configs[user]
  }

  public hasAnalyticsOptIn = (): boolean => {
    try {
      const config = this.currentUserConfig()
      return config.analyticsOptIn
    } catch (_) {
      return false
    }
  }

  public optInOrOut = (inOrOut: boolean) => {
    this.userConfigMustExist()
    const userConfig = this.currentUserConfig()
    userConfig.analyticsOptIn = inOrOut
    const all = this.show()
    const user = all.currentUserId
    const updateConfigFile = {
      ...all,
      configs: Object.assign(all.configs, { [user]: { ...userConfig } }),
    }
    this.store.save(updateConfigFile)
  }

  public setCurrentProjectId = (id: string): void => {
    this.userConfigMustExist()
    this.store.setCurrentProjectId(id)
  }

  public setCurrentUserId = (id: string): void => {
    if (this.configFileExists()) this.store.setCurrentUserId(id)
  }

  public setUsername = (username: string): void => {
    this.userConfigMustExist()
    this.store.setUsername(username)
  }

  public deleteUserConfig = (): void => {
    this.store.deleteUserConfig()
  }
}

const configConf = new Conf<ConfigStoreFormat>({
  cwd: path.join(os.homedir(), '.affinidi'),
  configName: 'config',
})

const store: IConfigStorer = {
  save: (params: ConfigStoreFormat): void => {
    // TODO validate the config before saving
    configConf.set('version', params.version)
    configConf.set('currentUserId', params.currentUserId)
    configConf.set('configs', params.configs)
  },

  clear: (): void => {
    configConf.clear()
  },

  getVersion: (): number | null => {
    const v = Number(configConf.get('version'))
    return Number.isNaN(v) ? null : v
  },
  getCurrentUser: function getCurrentUser(): string {
    return configConf.get('currentUserId')
  },
  getAllUserConfigs: (): Record<string, UserConfig> => {
    return configConf.get('configs')
  },

  setCurrentProjectId: function setCurrentProjectId(id: string): void {
    const configs = configConf.get('configs')
    configs[this.getCurrentUser()].activeProjectId = id
    configConf.set('configs', configs)
  },
  getOutputFormat: function getOutputFormat(): string {
    const configs = configConf.get('configs')
    const userId = this.getCurrentUser()

    if (!configs || !configs[userId]) {
      return 'plaintext'
    }

    return configs[userId].outputFormat
  },
  setOutputFormat: function setOutputFormat(outputFormat: string): void {
    const configs = configConf.get('configs')
    const userId = this.getCurrentUser()
    const newUserConfig: UserConfig = {
      activeProjectId: configs[userId].activeProjectId,
      outputFormat,
    }
    configs[userId] = newUserConfig
    configConf.set('configs', configs)
  },
  getUsername: function getUsername(): string {
    return configConf.get('username')
  },
  setUsername: function setUsername(username: string): void {
    configConf.set('username', username)
  },
  deleteUserConfig: function deleteUserConfig(): void {
    const userId = this.getCurrentUser()
    const configs = configConf.get('configs')
    delete configs[userId]
    configConf.set('configs', configs)
  },
  setCurrentUserId: function setCurrentUserId(id: string): void {
    configConf.set('currentUserId', id)
  },
}

export const testStore = new Map()
const testStorer: IConfigStorer = {
  save: (params: ConfigStoreFormat): void => {
    testStore.set('version', params.version)
    testStore.set('currentUserId', params.currentUserId)
    testStore.set('configs', params.configs)
  },

  clear: (): void => {
    testStore.clear()
  },

  getVersion: (): number => {
    return testStore.get('version')
  },
  getCurrentUser: function getCurrentUser(): string {
    return testStore.get('currentUserId')
  },
  getAllUserConfigs: function getAllUserConfigs(): Record<string, UserConfig> {
    return testStore.get('configs')
  },
  setCurrentProjectId: function setCurrentProjectId(id: string): void {
    const configs = this.getAllUserConfigs()
    configs[this.getCurrentUser()].activeProjectId = id
    testStore.set('configs', configs)
  },
  getOutputFormat: function getOutputFormat(): string {
    const configs = configConf.get('configs')
    const userId = this.getCurrentUser()

    if (!configs || !configs[userId]) {
      return 'plaintext'
    }

    return configs[userId].outputFormat
  },
  setOutputFormat: function setOutputFormat(outputFormat: string): void {
    const configs = testStore.get('configs')
    const userId = this.getCurrentUser()
    const newUserConfig: UserConfig = {
      activeProjectId: configs[userId].activeProjectId,
      outputFormat,
    }
    configs[userId] = newUserConfig
    testStore.set('configs', configs)
  },
  getUsername: function getUsername(): string {
    return testStore.get('username')
  },
  setUsername: function setUsername(username: string): void {
    testStore.set('username', username)
  },
  deleteUserConfig: function deleteUserConfig(): void {
    const configs = testStore.get('configs')
    const userId = this.getCurrentUser()
    delete configs[userId]
    testStore.set('configs', configs)
  },
  setCurrentUserId: function setCurrentUserId(id: string): void {
    testStore.set('currentUserId', id)
  },
}

export const configService = new ConfigService(process.env.NODE_ENV === 'test' ? testStorer : store)
