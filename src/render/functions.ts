import chalk from 'chalk'

import { noActiveProject, notAuthenticated, welcomeWizard } from './texts'

const indent = '  '

const bigName = `
█████╗  ███████╗███████╗██╗███╗   ██╗██╗██████╗ ██╗
██╔══██╗██╔════╝██╔════╝██║████╗  ██║██║██╔══██╗██║
███████║█████╗  █████╗  ██║██╔██╗ ██║██║██║  ██║██║
██╔══██║██╔══╝  ██╔══╝  ██║██║╚██╗██║██║██║  ██║██║
██║  ██║██║     ██║     ██║██║ ╚████║██║██████╔╝██║
╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚═════╝ ╚═╝
`

export type MessageBlock = { text: string; styled: string }

const nextStepMessageBlocks: MessageBlock[] = [
  {
    text: "To start using the Affinidi services, you need to create a project to get an Api-Key.\nThe Api-Key is required to access Affinidi's resources.",
    styled: `${chalk.yellow(
      'To start using the Affinidi services, you need to create a project to get an Api-Key.',
    )}\nThe Api-Key is required to access Affinidi's resources.`,
  },
  {
    text: `To create your new project, use the command below:\n${indent}$ affinidi create project PROJECT-NAME`,
    styled: `To create your new project, use the command below:\n${indent}${chalk.black.bgWhite(
      '$ affinidi create project PROJECT-NAME',
    )}`,
  },
  {
    text: 'Replace PROJECT-NAME with your own project name.',
    styled: `Replace ${chalk.bold('PROJECT-NAME')} with your own project name.`,
  },
]

export const welcomeMessageBlocks: MessageBlock[] = [
  { text: 'Welcome to', styled: 'Welcome to' },
  {
    text: bigName,
    styled: `${chalk.blue(bigName)}`,
  },
  {
    text: 'Start using our privacy-preserving tooling today,',
    styled: 'Start using our privacy-preserving tooling today,',
  },
  {
    text: 'and boilerplate your next privacy-preserving app!',
    styled: 'and boilerplate your next privacy-preserving app!',
  },
]

type MessageKeyBlock = { key: string } & MessageBlock

const welcomeKey = 'welcome'
const authenticatedKey = 'authenticated'
const activeProjectIdKey = 'activeProjectId'
const activeProjectNameKey = 'activeProjectName'

export const defaultWizardMessages: MessageKeyBlock[] = [
  {
    key: welcomeKey,
    text: welcomeWizard,
    styled: welcomeWizard,
  },
  {
    key: authenticatedKey,
    text: notAuthenticated,
    styled: notAuthenticated,
  },
  {
    key: activeProjectIdKey,
    text: noActiveProject,
    styled: noActiveProject,
  },
  {
    key: activeProjectNameKey,
    text: '',
    styled: '',
  },
]

const appendBreadCrumbs = (messages: MessageBlock[], breadcrumbs: string[]): MessageBlock[] => {
  const breadcrumbsBlock: MessageBlock = {
    text: breadcrumbs.join(' > '),
    styled: breadcrumbs.join(' > '),
  }

  if (breadcrumbs.length > 0) {
    messages.push(breadcrumbsBlock)
  }

  return messages
}

const wizardStatusWithCondition =
  (key: string) =>
  (value: string) =>
  (textFormatter: (t: string) => string) =>
  (msg: MessageKeyBlock) => {
    if (msg.key !== key || !value) {
      return msg
    }

    const text = textFormatter(value)
    return {
      ...msg,
      text,
      styled: text,
    }
  }

export const wizardStatusAuthenticated =
  (userEmail: string) =>
  (message: MessageKeyBlock): MessageKeyBlock => {
    return wizardStatusWithCondition(authenticatedKey)(userEmail)(
      (t: string) => `You are authenticated as: ${t}`,
    )(message)
  }

export const wizardStatusWithActiveProject =
  (projectId: string) =>
  (message: MessageKeyBlock): MessageKeyBlock => {
    return wizardStatusWithCondition(activeProjectIdKey)(projectId)(
      (t: string) => `Active project ID: ${t}`,
    )(message)
  }

export const wizardStatusWithActiveProjectName =
  (projectName: string) =>
  (message: MessageKeyBlock): MessageKeyBlock => {
    return wizardStatusWithCondition(activeProjectNameKey)(projectName)(
      (t: string) => `Active project name: ${t}`,
    )(message)
  }

export const wizardStatus = ({
  messages,
  breadcrumbs,
  userEmail,
  projectId,
  projectName,
}: {
  messages: MessageKeyBlock[]
  breadcrumbs: string[]
  userEmail?: string
  projectId?: string
  projectName?: string
}): MessageBlock[] => {
  const buildMessages = messages
    .map(wizardStatusAuthenticated(userEmail))
    .map(wizardStatusWithActiveProject(projectId))
    .map(wizardStatusWithActiveProjectName(projectName))
    .map(({ styled, text }) => ({ text, styled }))

  return appendBreadCrumbs(buildMessages, breadcrumbs)
}

export const mapStyled = (b: MessageBlock): string => b.styled
export const mapRawText = (b: MessageBlock): string => b.text

const getWelcomeUserMessageByType = (mapFn: (b: MessageBlock) => string): string[] =>
  welcomeMessageBlocks.map(mapFn)
export const getWelcomeUserRawMessages = (): string[] => getWelcomeUserMessageByType(mapRawText)

const getNextStepsMessageByType = (mapFn: (b: MessageBlock) => string): string[] =>
  nextStepMessageBlocks.map(mapFn)
export const getSignupNextStepRawMessages = (): string[] => getNextStepsMessageByType(mapRawText)

export const buildWelcomeUserMessageByType = (mapFn: (b: MessageBlock) => string): string => {
  return getWelcomeUserMessageByType(mapFn).join('\n\n')
}

export const WelcomeUserStyledMessage = buildWelcomeUserMessageByType(mapStyled)
export const WelcomeUserRawMessage = buildWelcomeUserMessageByType(mapRawText)
export const NextStepsRawMessage = nextStepMessageBlocks.map((m) => m.styled).join('\n\n')
export const wizardStatusMessage = (wizardStatusBlock: MessageBlock[]): string => {
  return wizardStatusBlock.map((m) => m.text).join('\n')
}

export const fakeJWT = () => {
  return Math.random().toString(32).substring(2)
}
