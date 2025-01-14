import { CliUx } from '@oclif/core'
import path from 'path'

import { analyticsService, generateUserMetadata } from '../services/analytics'
import { CliError, InvalidUseCase, NotSupportedPlatform, Unauthorized } from '../errors'
import { displayOutput } from '../middleware/display'
import { getSession } from '../services/user-management'
import { EventDTO } from '../services/analytics/analytics.api'
import { GitService, Writer } from '../services'
import { buildGeneratedAppNextStepsMessage } from '../render/texts'
import { fakeJWT } from '../render/functions'
import { ViewFormat } from '../constants'

export interface FlagsInput {
  platform?: PlatformType
  name?: string
  use_case?: UseCaseType
  output?: ViewFormat
  apiKey: string
  projectDid: string
  projectId: string
}

export enum Platforms {
  web = 'web',
  mobile = 'mobile',
}

export enum UseCasesAppNames {
  gamingReferenceApp = 'gaming',
  careerReferenceApp = 'career',
  accessWithoutOwnershipOfData = 'access-without-ownership-of-data',
  healthReferenceApp = 'health',
  educationReferenceApp = 'education',
  ticketingReferenceApp = 'ticketing',
  kycKyb = 'kyc-kyb',
}

type UseCaseType = `${UseCasesAppNames}`
type PlatformType = `${Platforms}`

const PORTABLE_REP_GITHUB = 'https://github.com/affinidi/reference-app-portable-rep.git'
const REFERENCE_APP_GITHUB =
  'https://github.com/affinidi/reference-app-certification-and-verification.git'

const isPortableReputationReferenceApp = (useCase: UseCaseType) =>
  ['career', 'gaming'].includes(useCase)

const download = async (useCase: UseCaseType, destination: string): Promise<void> => {
  const gitUrl = isPortableReputationReferenceApp(useCase)
    ? PORTABLE_REP_GITHUB
    : REFERENCE_APP_GITHUB

  try {
    await GitService.clone(gitUrl, destination, { subdirectory: `use-cases/${useCase}` })
  } catch (error) {
    throw Error(`Download Failed: ${error.message}`)
  }
}

const setUpProject = async (name: string, flags: FlagsInput): Promise<void> => {
  const { apiKey, projectDid, projectId } = flags

  const activeProjectApiKey = apiKey
  const activeProjectDid = projectDid
  const activeProjectId = projectId

  if (!activeProjectApiKey || !activeProjectDid || !activeProjectId) {
    throw Error(Unauthorized)
  }

  displayOutput({ itemToDisplay: `Setting up the project`, flag: flags.output })

  try {
    if (flags.use_case === 'career') {
      Writer.write(path.join(name, '.env'), [
        '# frontend-only envs',
        'NEXT_PUBLIC_HOST=http://localhost:3000',
        '',
        '# backend-only envs',
        'LOG_LEVEL=debug',
        '',
        'NEXTAUTH_URL=http://localhost:3000',
        `AUTH_JWT_SECRET=${fakeJWT() + fakeJWT() + fakeJWT()}`,
        '',
        'CLOUD_WALLET_API_URL=https://cloud-wallet-api.prod.affinity-project.org/api',
        'AFFINIDI_IAM_API_URL=https://affinidi-iam.apse1.affinidi.com/api',
        'VERIFIER_API_URL=https://affinity-verifier.prod.affinity-project.org/api',
        'ISSUANCE_API_URL=https://console-vc-issuance.apse1.affinidi.com/api',
        '',
        `PROJECT_ID=${activeProjectId}`,
        `PROJECT_DID=${activeProjectDid}`,
        `API_KEY_HASH=${activeProjectApiKey}`,
        '',
        'GITHUB_APP_CLIENT_ID=',
        'GITHUB_APP_CLIENT_SECRET=',
      ])

      return
    }

    if (flags.use_case === 'gaming') {
      Writer.write(path.join(name, '.env'), [
        '# frontend-only envs',
        'NEXT_PUBLIC_HOST=http://localhost:3000',
        '',
        '# backend-only envs',
        'LOG_LEVEL=debug',
        '',
        'NEXTAUTH_URL=http://localhost:3000',
        `AUTH_JWT_SECRET=${fakeJWT() + fakeJWT() + fakeJWT()}`,
        '',
        'CLOUD_WALLET_API_URL=https://cloud-wallet-api.prod.affinity-project.org/api',
        'AFFINIDI_IAM_API_URL=https://affinidi-iam.apse1.affinidi.com/api',
        'VERIFIER_API_URL=https://affinity-verifier.prod.affinity-project.org/api',
        'ISSUANCE_API_URL=https://console-vc-issuance.apse1.affinidi.com/api',
        '',
        `PROJECT_ID=${activeProjectId}`,
        `PROJECT_DID=${activeProjectDid}`,
        `API_KEY_HASH=${activeProjectApiKey}`,
        '',
        '## data providers',
        'BATTLENET_CLIENT_ID=',
        'BATTLENET_CLIENT_SECRET=',
        'BATTLENET_ISSUER=https://eu.battle.net/oauth',
        'BATTLENET_REGION=eu',
      ])

      return
    }

    Writer.write(path.join(name, '.env'), [
      '# frontend-only envs',
      'NEXT_PUBLIC_HOST=http://localhost:3000',
      '',
      'ISSUANCE_API_URL=https://console-vc-issuance.apse1.affinidi.com/api',
      'VERIFIER_API_URL=https://affinity-verifier.prod.affinity-project.org/api',
      'CLOUD_WALLET_API_URL=https://cloud-wallet-api.prod.affinity-project.org/api',
      '',
      'ISSUER_LOGIN=issuer@affinidi.com',
      'ISSUER_PASSWORD=test',
      '',
      `ISSUER_API_KEY_HASH=${activeProjectApiKey}`,
      `ISSUER_PROJECT_DID=${activeProjectDid}`,
      `ISSUER_PROJECT_ID=${activeProjectId}`,
    ])
  } catch (error) {
    displayOutput({
      itemToDisplay: `Failed to set up project: ${error.message}`,
      flag: flags.output,
      err: true,
    })
  }
}

export const generateApplication = async (flags: FlagsInput, timeStamp?: number): Promise<void> => {
  const { name, platform, use_case: useCase } = flags
  if (platform === Platforms.mobile) {
    throw new CliError(NotSupportedPlatform, 0, 'reference-app')
  }
  const { userId, label } = getSession()?.account
  const analyticsData: EventDTO = {
    name: isPortableReputationReferenceApp(useCase)
      ? 'APP_PORT_REP_GENERATION_STARTED'
      : 'APPLICATION_GENERATION_STARTED',
    category: 'APPLICATION',
    component: 'Cli',
    uuid: userId,
    metadata: {
      appName: name,
      commandId: 'affinidi.generate-application',
      timeTaken: timeStamp ? Math.floor((Date.now() - timeStamp) / 1000) : 0,
      ...generateUserMetadata(label),
    },
  }
  CliUx.ux.action.start('Generating an application')

  try {
    switch (useCase) {
      case UseCasesAppNames.healthReferenceApp:
      case UseCasesAppNames.educationReferenceApp:
      case UseCasesAppNames.ticketingReferenceApp:
      case UseCasesAppNames.gamingReferenceApp:
      case UseCasesAppNames.careerReferenceApp:
        await download(useCase, name)
        await analyticsService.eventsControllerSend(analyticsData)
        break
      case UseCasesAppNames.accessWithoutOwnershipOfData:
      case UseCasesAppNames.kycKyb:
        displayOutput({ itemToDisplay: 'Not implemented yet', flag: flags.output })
        break
      default:
        throw new CliError(InvalidUseCase, 0, 'reference-app')
    }
  } catch (error) {
    throw new CliError(`Failed to generate an application: ${error.message}`, 0, 'reference-app')
  }

  await setUpProject(name, flags)
  analyticsData.name = isPortableReputationReferenceApp(useCase)
    ? 'APP_PORT_REP_GENERATION_COMPLETED'
    : 'APPLICATION_GENERATION_COMPLETED'
  await analyticsService.eventsControllerSend(analyticsData)
  CliUx.ux.action.stop('\nApplication generated')

  const appPath = path.resolve(`${process.cwd()}/${name}`)
  displayOutput({
    itemToDisplay: buildGeneratedAppNextStepsMessage(name, appPath, useCase),
    flag: flags.output,
  })
}
