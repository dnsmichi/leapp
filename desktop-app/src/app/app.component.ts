import { Component, OnInit } from '@angular/core'
import { environment } from '../environments/environment'
import { AppService } from './services/app.service'
import { Router } from '@angular/router'
import { setTheme } from 'ngx-bootstrap/utils'
import { RotationService } from './services/rotation.service'
import { SessionServiceFactory } from './services/session-service-factory'
import { UpdaterService } from './services/updater.service'
import compareVersions from 'compare-versions'
import { RetrocompatibilityService } from './services/retrocompatibility.service'
import { LoggerLevel, LoggingService } from '@noovolari/leapp-core/services/logging-service'
import { Repository } from '@noovolari/leapp-core/services/repository'
import { WorkspaceService } from '@noovolari/leapp-core/services/workspace.service'
import { LeappParseError } from '@noovolari/leapp-core/errors/leapp-parse-error'
import { TimerService } from '@noovolari/leapp-core/services/timer-service'
import { constants } from '@noovolari/leapp-core/models/constants'
import { FileService } from '@noovolari/leapp-core/services/file-service'
import { AwsCoreService } from '@noovolari/leapp-core/services/aws-core-service'
import { LeappCoreService } from './services/leapp-core.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private fileService: FileService
  private repository: Repository
  private awsCoreService: AwsCoreService
  private loggingService: LoggingService
  private timerService: TimerService
  private sessionServiceFactory: SessionServiceFactory
  private workspaceService: WorkspaceService

  /* Main app file: launches the Angular framework inside Electron app */
  constructor(private app: AppService, private retrocompatibilityService: RetrocompatibilityService,
              private rotationService: RotationService, private router: Router, private updaterService: UpdaterService,
              leappCoreService: LeappCoreService) {
    this.repository = leappCoreService.repository
    this.fileService = leappCoreService.fileService
    this.awsCoreService = leappCoreService.awsCoreService
    this.loggingService = leappCoreService.loggingService
    this.timerService = leappCoreService.timerService
    this.sessionServiceFactory = leappCoreService.sessionServiceFactory
    this.workspaceService = leappCoreService.workspaceService
  }

  async ngOnInit() {
    // We get the right moment to set an hook to app close
    const ipc = this.app.getIpcRenderer()
    ipc.on('app-close', () => {
      this.loggingService.logger('Preparing for closing instruction...', LoggerLevel.info, this)
      this.beforeCloseInstructions()
    })

    // Use ngx bootstrap 4
    setTheme('bs4')

    if (environment.production) {
      // Clear both info and warn message in production
      // mode without removing them from code actually
      console.warn = () => {
      }
      console.log = () => {
      }
    }

    // Prevent Dev Tool to show on production mode
    this.app.blockDevToolInProductionMode()

    // Before retrieving an actual copy of the workspace we
    // check and in case apply, our retro compatibility service
    if (this.retrocompatibilityService.isRetroPatchNecessary()) {
      await this.retrocompatibilityService.adaptOldWorkspaceFile()
    }

    try {
      if (!this.repository.getAwsSsoConfiguration().browserOpening) {
        this.repository.setBrowserOpening(constants.inApp.toString())
      }
    } catch {
      throw new LeappParseError(this, 'We had trouble parsing your Leapp-lock.json file. It is either corrupt, obsolete, or with an error.')
    }

    // Check the existence of a pre-Leapp credential file and make a backup
    this.showCredentialBackupMessageIfNeeded()

    // All sessions start stopped when app is launched
    if (this.workspaceService.sessions.length > 0) {
      this.workspaceService.sessions.forEach(sess => {
        const concreteSessionService = this.sessionServiceFactory.getSessionService(sess.type)
        concreteSessionService.stop(sess.sessionId)
      })
    }

    // Start Global Timer
    this.timerService.start(this.rotationService.rotate.bind(this.rotationService))

    // Launch Auto Updater Routines
    this.manageAutoUpdate()

    // Go to initial page if no sessions are already created or
    // go to the list page if is your second visit
    if (this.workspaceService.sessions.length > 0) {
      await this.router.navigate(['/sessions', 'session-selected'])
    } else {
      await this.router.navigate(['/start', 'start-page'])
    }
  }

  /**
   * This is an hook on the closing app to remove credential file and force stop using them
   */
  private beforeCloseInstructions() {
    // Check if we are here
    this.loggingService.logger('Closing app with cleaning process...', LoggerLevel.info, this)

    // We need the Try/Catch as we have a the possibility to call the method without sessions
    try {
      // Clean the config file
      this.app.cleanCredentialFile()
    } catch (err) {
      this.loggingService.logger('No sessions to stop, skipping...', LoggerLevel.error, this, err.stack)
    }

    // Finally quit
    this.app.quit()
  }

  /**
   * Show that we created a copy of original credential file if present in the system
   */
  private showCredentialBackupMessageIfNeeded() {
    const oldAwsCredentialsPath = this.app.getOS().homedir() + '/' + environment.credentialsDestination
    const newAwsCredentialsPath = oldAwsCredentialsPath + '.leapp.bkp'
    const check = this.workspaceService.sessions.length === 0 &&
      this.app.getFs().existsSync(oldAwsCredentialsPath) &&
      !this.app.getFs().existsSync(newAwsCredentialsPath)

    this.loggingService.logger(`Check existing credential file: ${check}`, LoggerLevel.info, this)

    if (check) {
      this.app.getFs().renameSync(oldAwsCredentialsPath, newAwsCredentialsPath)
      this.app.getFs().writeFileSync(oldAwsCredentialsPath, '')
      this.app.getDialog().showMessageBox({
        type: 'info',
        icon: __dirname + '/assets/images/Leapp.png',
        message: 'You had a previous credential file. We made a backup of the old one in the same directory before starting.'
      })
    } else if (!this.fileService.exists(this.awsCoreService.awsCredentialPath())) {
      this.fileService.writeFileSync(this.awsCoreService.awsCredentialPath(), '')
    }
  }

  /**
   * Launch Updater process
   *
   * @private
   */
  private manageAutoUpdate(): void {
    let savedVersion

    try {
      savedVersion = this.updaterService.getSavedAppVersion()
    } catch (error) {
      savedVersion = this.updaterService.getCurrentAppVersion()
    }

    try {
      if (compareVersions(savedVersion, this.updaterService.getCurrentAppVersion()) <= 0) {
        // We always need to maintain this order: fresh <= saved <= online
        this.updaterService.updateVersionJson(this.updaterService.getCurrentAppVersion())
      }
    } catch (error) {
      this.updaterService.updateVersionJson(this.updaterService.getCurrentAppVersion())
    }

    const ipc = this.app.getIpcRenderer()
    ipc.on('UPDATE_AVAILABLE', async (_, info) => {

      const releaseNote = await this.updaterService.getReleaseNote()
      this.updaterService.setUpdateInfo(info.version, info.releaseName, info.releaseDate, releaseNote)
      if (this.updaterService.isUpdateNeeded()) {
        this.updaterService.updateDialog()
        this.workspaceService.sessions = [...this.workspaceService.sessions]
        this.repository.updateSessions(this.workspaceService.sessions)
      }
    })
  }
}