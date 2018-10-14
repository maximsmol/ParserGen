E -> SurroundE | PreE | PostE | InfixE

SurroundE ->
  '(' E ')' |
  '[' E ']' |
  '{' E '}' |
  '\\' E '\\' |
  '`' E '`' |
  '"' E '"'

PreE ->
  '-' E |
  '+' E |
  '~' E |
  '!' E |
  '$' E

PostE ->
  E '\'' |
  E '!' |
  E '?'

InfixE ->
  E '+' E | E '-' E | E '*' E | E '/' E |
  E '~' E | E '=' E |
  E '>' E | E '<' E | E '<=' E | E '>=' E |
  E ' ' E | E '.' E | E ',' E |
  E '^' E | E '_' E | E '^^' E | E '__' E |
  E '|' E | E '&' E |
  E '||' E | E '&&' E |
  E ':' E
