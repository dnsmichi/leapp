import {Component, OnDestroy, OnInit} from '@angular/core';
import {WorkspaceService} from '../../services/workspace.service';
import Folder from '../../models/folder';
import Segment from '../../models/Segment';
import {
  globalFilteredSessions,
  globalHasFilter,
  globalResetFilter, globalSegmentFilter
} from '../command-bar/command-bar.component';
import {Session} from '../../models/session';
import {BehaviorSubject} from 'rxjs';

export const segmentFilter = new BehaviorSubject<boolean>(false);

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss']
})
export class SideBarComponent implements OnInit, OnDestroy {

  folders: Folder[];
  segments: Segment[];
  subscription;

  constructor(private workspaceService: WorkspaceService) {
    this.folders = JSON.parse(JSON.stringify(this.workspaceService.getFolders()));
    this.segments = JSON.parse(JSON.stringify(this.workspaceService.getSegments()));
  }

  ngOnInit(): void {
    this.subscription = segmentFilter.subscribe(() => {
      this.folders = JSON.parse(JSON.stringify(this.workspaceService.getFolders()));
      this.segments = JSON.parse(JSON.stringify(this.workspaceService.getSegments()));
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  resetFilters() {
    globalFilteredSessions.next(this.workspaceService.sessions);
    globalHasFilter.next(false);
    globalResetFilter.next(true);
  }

  showOnlyPinned() {
    globalFilteredSessions.next(this.workspaceService.sessions.filter((s: Session) => this.workspaceService.getWorkspace().pinned.indexOf(s.sessionId) !== -1));
  }

  applySegmentFilter(segment: Segment, event) {
    event.preventDefault();
    event.stopPropagation();
    globalSegmentFilter.next(JSON.parse(JSON.stringify(segment)));
  }

  deleteSegment(segment: Segment, event) {
    event.preventDefault();
    event.stopPropagation();
    this.workspaceService.removeSegment(segment);
  }
}
