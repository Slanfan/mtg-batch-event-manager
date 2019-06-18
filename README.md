# Magic: the Gathering - Batch Event Manager

This is a software to create and manage Batch Events for Magic: the Gathering.
Batches are great when you need to run multiple swiss rounds simultaneously.

You can create batches with both random and/or standings based pairings.

Report matches and end the batch when all matches are reported.

Standings* and pairings* are calculated and generated according to 
Magic: the Gathering tournament documentation.


* https://blogs.magicjudges.org/rules/mtr3-1/
* https://blogs.magicjudges.org/rules/mtr10-4/



# Version history

1.0.12
- Added support to rename attendee and all instances of the name
- Bugfix: Adding new attendee during active batch adds the attendee as unpaired for each segment in the batch

1.0.11
- Adding an attendee during active batch will add them as unpaired player as well.
- Manual pairing now only shows new players and unpaired players within selected segment.
- Added csv download for both attendee list and match list.
- Added bootstrap, angular and materialdesignicons directly to the project.
