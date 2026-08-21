/**
 * ============================================================================
 *  FILL THIS FILE IN. It is the only place real restaurant data is entered.
 * ============================================================================
 *
 * Every value written as `TODO` needs a real value looked up on the booking platform.
 * Nothing here is guessed: the restaurant names, the city and the timezone are facts you
 * can check at a glance, and everything that decides *when an alert fires* is left blank
 * on purpose.
 *
 * ── How to fill in one restaurant ──────────────────────────────────────────
 *
 *  1. Open the restaurant's booking page (Resy, Tock, OpenTable, SevenRooms, or the
 *     restaurant's own site).
 *  2. `bookingUrl`   — copy the URL of that page. Must start with https://
 *  3. `platform`     — whichever platform that URL belongs to.
 *  4. `daysInAdvance`— how far ahead the calendar lets you book. Resy usually states it
 *                      ("Reservations open 30 days in advance"). If it does not, find the
 *                      last date the calendar will accept and count the days from today.
 *  5. `releaseTime`  — the wall-clock time new dates appear, "HH:MM" on a 24-hour clock,
 *                      in New York time. Midnight is "00:00", 10am is "10:00".
 *  6. `source`       — where you saw it and the date you checked.
 *
 * Then run `npm run db:seed`. Anything still holding a `TODO` is skipped and listed, so a
 * half-finished file is safe to run as often as you like.
 *
 * ── The shape, with made-up numbers ────────────────────────────────────────
 *
 *   {
 *     name: "The Example Room",
 *     city: "New York",
 *     releaseRule: {
 *       platform: "RESY",
 *       daysInAdvance: 30,
 *       releaseTime: "00:00",
 *       timezone: "America/New_York",
 *       bookingUrl: "https://resy.com/cities/new-york-ny/venues/the-example-room",
 *     },
 *     source: "resy.com venue page, checked 2026-08-20",
 *   }
 *
 *   ^ Illustration only. Those numbers are invented — do not copy them onto a real
 *     restaurant.
 *
 * ── Notes ──────────────────────────────────────────────────────────────────
 *
 *  • The eight below are a starting list of hard-to-book New York restaurants. Swap any
 *    of them for one you would rather demo; only `name` and `city` identify a row.
 *  • The schema allows a restaurant to have several release rules (one per platform).
 *    One each is enough for now, and the database enforces at most one rule per platform
 *    per restaurant.
 *  • Re-running the seed updates existing rows in place rather than duplicating them, so
 *    you can add restaurants a few at a time.
 */

import { TODO, type RestaurantSeed } from "./types";

/** Every restaurant in this list is in New York City, which is US Eastern time. */
const NYC = "America/New_York";

export const nycRestaurants: RestaurantSeed[] = [
  {
    name: "Minetta Tavern",
    city: "New York",
    releaseRule: {
      platform: "RESY",
      daysInAdvance: 30,
      releaseTime: "00:00",
      timezone: NYC,
      bookingUrl: "https://resy.com/cities/new-york-ny/venues/minetta-tavern",
    },
    source: "resy.com, checked 2026-08-21",
  },
  {
    name: "Carbone",
    city: "New York",
    releaseRule: {
      platform: TODO,
      daysInAdvance: TODO,
      releaseTime: "00:00",
      timezone: NYC,
      bookingUrl: TODO,
    },
    source: TODO,
  },
  {
    name: "4 Charles Prime Rib",
    city: "New York",
    releaseRule: {
      platform: TODO,
      daysInAdvance: TODO,
      releaseTime: TODO,
      timezone: NYC,
      bookingUrl: TODO,
    },
    source: TODO,
  },
  {
    name: "Don Angie",
    city: "New York",
    releaseRule: {
      platform: TODO,
      daysInAdvance: TODO,
      releaseTime: TODO,
      timezone: NYC,
      bookingUrl: TODO,
    },
    source: TODO,
  },
  {
    name: "Lilia",
    city: "New York",
    releaseRule: {
      platform: TODO,
      daysInAdvance: TODO,
      releaseTime: TODO,
      timezone: NYC,
      bookingUrl: TODO,
    },
    source: TODO,
  },
  {
    name: "Rezdôra",
    city: "New York",
    releaseRule: {
      platform: TODO,
      daysInAdvance: TODO,
      releaseTime: TODO,
      timezone: NYC,
      bookingUrl: TODO,
    },
    source: TODO,
  },
  {
    name: "Tatiana by Kwame Onwuachi",
    city: "New York",
    releaseRule: {
      platform: TODO,
      daysInAdvance: TODO,
      releaseTime: TODO,
      timezone: NYC,
      bookingUrl: TODO,
    },
    source: TODO,
  },
  {
    name: "Semma",
    city: "New York",
    releaseRule: {
      platform: TODO,
      daysInAdvance: TODO,
      releaseTime: TODO,
      timezone: NYC,
      bookingUrl: TODO,
    },
    source: TODO,
  },
];
