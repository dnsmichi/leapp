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
import {BehaviorSubject, Observable} from 'rxjs';
import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {ConfirmationDialogComponent} from '../dialogs/confirmation-dialog/confirmation-dialog.component';
import {Constants} from '../../models/constants';

export interface SelectedSegment {
  name: string;
  selected: boolean;
}

export const segmentFilter = new BehaviorSubject<Segment[]>([]);

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss']
})
export class SideBarComponent implements OnInit, OnDestroy {

  folders: Folder[];
  segments: Segment[];
  selectedS: SelectedSegment[];
  subscription;
  showAll: boolean;
  showPinned: boolean;
  modalRef: BsModalRef;

  constructor(private workspaceService: WorkspaceService, private bsModalService: BsModalService) {
    this.showAll = true;
    this.showPinned = false;
  }

  ngOnInit(): void {
    this.subscription = segmentFilter.subscribe(segments => {
      this.segments = segments;
      this.selectedS = this.segments.map(segment => ({ name: segment.name, selected: false }));
    });
    segmentFilter.next(this.workspaceService.getSegments());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  resetFilters() {
    this.showAll = true;
    this.showPinned = false;
    this.selectedS.forEach(s => s.selected = false);
    globalFilteredSessions.next(this.workspaceService.sessions);
    globalHasFilter.next(false);
    globalResetFilter.next(true);
  }

  showOnlyPinned() {
    this.showAll = false;
    this.showPinned = true;
    this.selectedS.forEach(s => s.selected = false);
    globalFilteredSessions.next(this.workspaceService.sessions.filter((s: Session) => this.workspaceService.getWorkspace().pinned.indexOf(s.sessionId) !== -1));
  }

  applySegmentFilter(segment: Segment, event) {
    event.preventDefault();
    event.stopPropagation();

    this.showAll = false;
    this.showPinned = false;
    this.selectedS.forEach(s => s.selected = false);

    const selectedIndex = this.selectedS.findIndex(s => s.name === segment.name);
    this.selectedS[selectedIndex].selected = true;

    globalSegmentFilter.next(JSON.parse(JSON.stringify(segment)));
  }

  deleteSegment(segment: Segment, event) {
    event.preventDefault();
    event.stopPropagation();
    console.log(segment);
    this.workspaceService.removeSegment(segment);
    this.segments = JSON.parse(JSON.stringify(this.workspaceService.getSegments()));
  }

  selectedSegmentCheck(segment: Segment) {
    const index = this.selectedS.findIndex(s => s.name === segment.name);
    return this.selectedS[index].selected ? 'selected-segment' : '';
  }

  showConfirmationDialog(segment: Segment, event) {
    const message = 'Are you sure you want to delete the segment?';
    const callback = (answerString: string) => {
      if(answerString === Constants.confirmed.toString()) {
        this.deleteSegment(segment, event);
      }
    };
    this.modalRef = this.bsModalService.show(ConfirmationDialogComponent, {
      animated: false,
      initialState: {
        message,
        callback,
      }
    });
  }
}
