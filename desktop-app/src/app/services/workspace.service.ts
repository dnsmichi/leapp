import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import * as AWS from 'aws-sdk';
import Repository from '../../../../core/services/repository';
import {Session} from '../../../../core/models/session';
import {SessionStatus} from '../../../../core/models/session-status';
import {SessionType} from '../../../../core/models/session-type';
import {AwsIamRoleChainedSession} from '../../../../core/models/aws-iam-role-chained-session';
import {AwsIamUserSession} from '../../../../core/models/aws-iam-user-session';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  // Expose the observable$ part of the _sessions subject (read only stream)
  readonly sessions$: Observable<Session[]>;

  // - We set the initial state in BehaviorSubject's constructor
  // - Nobody outside the Store should have access to the BehaviorSubject
  //   because it has the write rights
  // - Writing to state should be handled by specialized Store methods
  // - Create one BehaviorSubject per store entity, for example if you have
  //   create a new BehaviorSubject for it, as well as the observable$, and getters/setters
  private readonly _sessions;

  private repository: Repository;

  constructor() {
    this._sessions = new BehaviorSubject<Session[]>([]);
    this.sessions$ = this._sessions.asObservable();
    this.sessions = this.repository.getSessions();
    this.repository = Repository.getInstance();
  }

  // the getter will return the last value emitted in _sessions subject
  get sessions(): Session[] {
    return this._sessions.getValue();
  }

  // assigning a value to this.sessions will push it onto the observable
  // and down to all of its subscribers (ex: this.sessions = [])
  set sessions(sessions: Session[]) {
    //this.updatePersistedSessions(sessions);
    this._sessions.next(sessions);
  }

  addSession(session: Session) {
    // we assign a new copy of session by adding a new session to it
    this.sessions = [
      ...this.sessions,
      session
    ];
  }

  removeSession(sessionId: string) {
    this.sessions = this.sessions.filter(session => session.sessionId !== sessionId);
  }

  get(sessionId: string): Session {
    const sessionFiltered = this.sessions.find(session => session.sessionId === sessionId);
    return sessionFiltered ? sessionFiltered : null;
  }

  update(sessionId: string, session: Session) {
    const sessions = this.sessions;
    const index = sessions.findIndex(sess => sess.sessionId === sessionId);
    if(index > -1) {
      this.sessions[index] = session;
      this.sessions = [...this.sessions];
    }
  }

  listPending(): Session[] {
    return (this.sessions.length > 0) ? this.sessions.filter( (session) => session.status === SessionStatus.pending ) : [];
  }

  listActive(): Session[] {
    return (this.sessions.length > 0) ? this.sessions.filter( (session) => session.status === SessionStatus.active ) : [];
  }

  listInActive(): Session[] {
    return (this.sessions.length > 0) ? this.sessions.filter( (session) => session.status === SessionStatus.inactive ) : [];
  }

  listAssumable(): Session[] {
    return (this.sessions.length > 0) ? this.sessions.filter( (session) => session.type !== SessionType.azure ) : [];
  }

  listIamRoleChained(parentSession?: Session): Session[] {
    let childSession = (this.sessions.length > 0) ? this.sessions.filter( (session) => session.type === SessionType.awsIamRoleChained ) : [];
    if (parentSession) {
      childSession = childSession.filter(session => (session as AwsIamRoleChainedSession).parentSessionId === parentSession.sessionId );
    }
    return childSession;
  }

  listAwsSsoRoles() {
    return (this.sessions.length > 0) ? this.sessions.filter((session) => session.type === SessionType.awsSsoRole) : [];
  }

  updateSessionTokenExpiration(session: Session, getSessionTokenResponse: AWS.STS.GetSessionTokenResponse) {
    const index = this.sessions.indexOf(session);
    const currentSession: Session = this.sessions[index];
    (currentSession as AwsIamUserSession).sessionTokenExpiration = getSessionTokenResponse.Credentials.Expiration.toISOString();
    this.sessions[index] = currentSession;
    this.sessions = [...this.sessions];
  }

  /*private getPersistedSessions(): Session[] {
    const workspace = Repository.getInstance().get();
    return workspace.sessions;
  }

  private updatePersistedSessions(sessions: Session[]): void {
    const workspace = Repository.getInstance().get();
    workspace.sessions = sessions;
    Repository.getInstance().persist(workspace);
  }*/
}
