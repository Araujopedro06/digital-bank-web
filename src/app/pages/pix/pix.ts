import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** The three things anyone opens a Pix screen to do, and nothing else. */
@Component({
  selector: 'app-pix',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './pix.html',
  styleUrl: './pix.scss',
})
export class Pix {}
