import { expect, test } from '@oclif/test'
import { StatusCodes } from 'http-status-codes'
import { CliUx } from '@oclif/core'

import { IAM_URL } from '../../../../src/services/iam'
import { projectSummary } from '../../../../src/fixtures/mock-projects'
import { ServiceDownError, Unauthorized } from '../../../../src/errors'
import { configService } from '../../../../src/services'
import * as authentication from '../../../../src/middleware/authentication'
import { vaultService } from '../../../../src/services/vault/typedVaultService'
import { createSession } from '../../../../src/services/user-management'

const testUserId = '38efcc70-bbe1-457a-a6c7-b29ad9913648'
const testProjectId = 'random-test-project-id'
const doNothing = () => {}

describe('show project command', () => {
  before(() => {
    createSession('email', testUserId, 'sessionToken')
    configService.create(testUserId, testProjectId)
    configService.optInOrOut(true)
  })
  after(() => {
    configService.clear()
    vaultService.clear()
  })
  test
    .nock(`${IAM_URL}`, (api) =>
      api
        .get(`/projects/${projectSummary.project.projectId}/summary`)
        .reply(StatusCodes.OK, projectSummary),
    )
    .stub(CliUx.ux.action, 'start', () => () => doNothing)
    .stub(CliUx.ux.action, 'stop', () => doNothing)
    .stdout()
    .command(['show project', projectSummary.project.projectId])
    .it('runs show project with a specific project-id', (ctx) => {
      expect(ctx.stdout).to.contain('name : Awesome project')
      expect(ctx.stdout).to.contain('projectId : some-project1-id')
      expect(ctx.stdout).to.contain('apiKeyHash : ********************')
    })
  describe('Showing a project and server is down', () => {
    test
      .nock(`${IAM_URL}`, (api) =>
        api
          .get(`/projects/${projectSummary.project.projectId}/summary`)
          .reply(StatusCodes.INTERNAL_SERVER_ERROR),
      )
      .stub(authentication, 'isAuthenticated', () => true)
      .stub(CliUx.ux.action, 'start', () => () => doNothing)
      .stub(CliUx.ux.action, 'stop', () => doNothing)
      .stdout()
      .command(['show project', projectSummary.project.projectId])
      .it('runs show project while the service is down', (ctx) => {
        expect(ctx.stdout).to.contain(ServiceDownError)
      })
  })
  describe('Showing active project', () => {
    before(() => {
      vaultService.setActiveProject(projectSummary)
    })
    test
      .nock(`${IAM_URL}`, (api) =>
        api
          .get(`/projects/${projectSummary.project.projectId}/summary`)
          .reply(StatusCodes.OK, projectSummary),
      )
      .stub(authentication, 'isAuthenticated', () => true)
      .stub(CliUx.ux.action, 'start', () => () => doNothing)
      .stub(CliUx.ux.action, 'stop', () => doNothing)
      .stdout()
      .stub(authentication, 'isAuthenticated', () => true)
      .command(['show project', '--active'])
      .it('runs show project with active project', (ctx) => {
        expect(ctx.stdout).to.contain('name : Awesome project')
        expect(ctx.stdout).to.contain('projectId : some-project1-id')
        expect(ctx.stdout).to.contain('apiKeyHash : ********************')
      })
  })

  test
    .stdout()
    .command(['show project', '--active'])
    .it('shows next step message when no active project', (ctx) => {
      expect(ctx.stdout).to.contain('you need to create a project to get an Api-Key')
    })

  describe('Showing a project while not authorized', () => {
    test
      .stub(CliUx.ux.action, 'start', () => () => doNothing)
      .stub(CliUx.ux.action, 'stop', () => doNothing)
      .stdout()
      .command(['show project', projectSummary.project.projectId])
      .it('runs show project while user is unauthorized', (ctx) => {
        expect(ctx.stdout).to.contain(Unauthorized)
      })
  })
})
