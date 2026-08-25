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
 *  1. Open the restaurant's booking page — whichever platform it uses.
 *  2. `bookingUrl`   — copy the URL of that page. Must start with https://
 *  3. `platform`     — whichever platform that URL belongs to. Any platform is allowed,
 *                      written however reads naturally: "Resy", "SevenRooms",
 *                      "DoorDash", "OpenTable", "Tock", "Yelp", "Table Check". Use
 *                      "Direct" for the restaurant's own site, or "Other" if nothing
 *                      fits. Capitalisation and spaces do not matter — it is normalised
 *                      to a lowercase slug, so "SevenRooms" and "Seven Rooms" both become
 *                      "sevenrooms" and cannot end up recorded as two platforms.
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
 *       platform: "Resy",
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
 *  • For the platforms we recognise, the booking link is cross-checked against the host it
 *    should be on, so labelling a Tock link "Resy" is caught. A platform we have not seen
 *    before is accepted without that check — there is nothing to check it against.
 *  • Re-running the seed updates existing rows in place rather than duplicating them, so
 *    you can add restaurants a few at a time.
 *  • Photos live in `public/restaurants/` and are referenced as `imageUrl`, e.g.
 *    `/restaurants/minetta-tavern.jpg`. Until the file is there, the catalog card falls
 *    back to the striped placeholder.
 */

// Every entry below is filled in, so the `TODO` sentinel is not currently imported.
// Adding a restaurant you have not finished researching means importing it again:
//   import { TODO, type RestaurantSeed } from "./types";
import type { RestaurantSeed } from "./types";

/** Every restaurant in this list is in New York City, which is US Eastern time. */
const NYC = "America/New_York";

export const nycRestaurants: RestaurantSeed[] = [
  {
    name: "Minetta Tavern",
    city: "New York",
    imageUrl: "/restaurants/minetta-tavern.jpg",
    releaseRule: {
      platform: "Resy",
      daysInAdvance: 30,
      releaseTime: "00:00",
      timezone: NYC,
      bookingUrl: "https://resy.com/cities/new-york-ny/venues/minetta-tavern",
    },
    source: "resy.com, checked 2026-08-21",
  },
  {
    name: "Or'esh",
    city: "New York",
    imageUrl: "/restaurants/oresh.jpg",
    releaseRule: {
      platform: "DoorDash",
      daysInAdvance: 7,
      releaseTime: "10:00",
      timezone: NYC,
      bookingUrl: "https://doordash.com/reservations/r/450wbroadway",
    },
    source: "doordash.com + oresh.com, checked 2026-08-22",
  },
  {
    name: "L'Artusi",
    city: "New York",
    imageUrl: "/restaurants/lartusi.jpg",
    releaseRule: {
      platform: "Resy",
      daysInAdvance: 14,
      releaseTime: "00:00",
      timezone: NYC,
      bookingUrl: "https://resy.com/cities/new-york-ny/venues/lartusi-ny",
    },
    source: "resy.com, checked 2026-08-22",
  },
  {
    name: "The Four Horsemen",
    city: "New York",
    imageUrl: "/restaurants/the-four-horsemen.jpg",
    releaseRule: {
      platform: "Resy",
      daysInAdvance: 30,
      releaseTime: "07:00",
      timezone: NYC,
      bookingUrl: "https://resy.com/cities/new-york-ny/venues/the-four-horsemen",
    },
    source: "fourhorsemenbk.com/reservations + resy.com, checked 2026-08-23",
  },
  {
    name: "Via Carota",
    city: "New York",
    imageUrl: "/restaurants/via-carota.jpg",
    releaseRule: {
      platform: "Resy",
      daysInAdvance: 30,
      releaseTime: "10:00",
      timezone: NYC,
      bookingUrl: "https://resy.com/cities/new-york-ny/venues/via-carota",
    },
    source: "resy.com, checked 2026-08-23",
  },
  {
    name: "Soothr",
    city: "New York",
    imageUrl: "/restaurants/soothr.jpg",
    releaseRule: {
      platform: "OpenTable",
      daysInAdvance: 30,
      releaseTime: "00:00",
      timezone: NYC,
      bookingUrl: "https://www.opentable.com/r/soothr-new-york",
    },
    source: "opentable.com, checked 2026-08-23",
  },
  {
    name: "Don Angie",
    city: "New York",
    imageUrl: "/restaurants/don-angie.jpg",
    releaseRule: {
      platform: "OpenTable",
      daysInAdvance: 7,
      releaseTime: "09:00",
      timezone: NYC,
      bookingUrl: "https://www.opentable.com/booking/restref/availability?correlationId=dec39ed9-8fba-484b-97ca-92a35bb61947&restRef=994474",
    },
    source: "donangie.com, checked 2026-08-23",
  },
  {
    name: "Torrisi",
    city: "New York",
    imageUrl: "/restaurants/torrisi.jpg",
    releaseRule: {
      platform: "Resy",
      daysInAdvance: 30,
      releaseTime: "10:00",
      timezone: NYC,
      bookingUrl: "https://resy.com/cities/new-york-ny/venues/torrisi",
    },
    source: "resy.com & torrisinyc.com, checked 2026-08-23",
  },
];
