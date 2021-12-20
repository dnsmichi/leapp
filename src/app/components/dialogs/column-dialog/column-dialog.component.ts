import {Component, OnDestroy, OnInit} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {AppService} from '../../../services/app.service';
import {FormControl, FormGroup} from '@angular/forms';
import {globalColumns, IGlobalColumns} from "../../command-bar/command-bar.component";

@Component({
  selector: 'app-column-dialog',
  templateUrl: './column-dialog.component.html',
  styleUrls: ['./column-dialog.component.scss']
})
export class ColumnDialogComponent implements OnInit, OnDestroy {

  columnForm = new FormGroup({
    role: new FormControl(true),
    provider: new FormControl(true),
    namedProfile: new FormControl(true),
    region: new FormControl(true)
  });

  eGlobalColumns: IGlobalColumns;

  private subscription;
  private values;
  private columnSubscription;

  constructor(private bsModalRef: BsModalRef, private appService: AppService) {
    this.subscription = this.columnForm.valueChanges.subscribe((values: IGlobalColumns) => {
      globalColumns.next(values);
      this.values = values;
      console.log(values);
    });

    this.columnSubscription = globalColumns.subscribe(value => {
      this.eGlobalColumns = value;
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  closeModal() {
    this.appService.closeModal();
  }

  setColumns() {
    globalColumns.next(this.values);
    this.appService.closeModal();
  }
}
