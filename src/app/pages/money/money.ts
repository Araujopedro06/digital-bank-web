import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Where a new account gets something to spend. None of this money is real, which
 * is the only reason a button that hands it out can exist.
 */
@Component({
  selector: 'app-money',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './money.html',
  styleUrl: './money.scss',
})
export class Money {}
