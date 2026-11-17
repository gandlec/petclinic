@fixture:default
Feature: Search owners across all visible columns
  As a clinic user
  I want to filter owners by any part of their name, address, city, phone or pet name
  So that I can quickly find the owners I care about, regardless of case

  Background:
    Given the clinic has these owners
      | Harry Potter   |
      | Beatrix Potter |

  Scenario Outline: Filter owners by a case-insensitive substring of any visible column
    When I open the owners page
    And I search owners for "<search>"
    Then exactly these owners are listed: "<owners>"

    Examples:
      | search  | owners                       |
      | Potter  | Harry Potter, Beatrix Potter |
      | potter  | Harry Potter, Beatrix Potter |
      | otter   | Harry Potter, Beatrix Potter |
      | Harry   | Harry Potter                 |
      | Privet  | Harry Potter                 |
      | 90844   | Harry Potter                 |
      | Hedwig  | Harry Potter                 |
      | Sawrey  | Beatrix Potter               |
      | Mittens | Beatrix Potter               |
      | Zzzz    |                              |

  @generate_sequence
  Scenario: Searching with an empty last name lists every owner
    When I open the owners page
    And I search owners for ""
    Then every owner in the clinic is listed
