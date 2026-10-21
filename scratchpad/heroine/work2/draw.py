"""A tiny pixel canvas for writing PAINT patches: ops in frame coordinates, prints '@part x0 y0' blocks."""


def stretch(rows, at, n):
    """The rows with row `at` repeated n more times (a longer shin)."""
    return rows[:at] + [rows[at]] * n + rows[at:]


def near_shift(y):
    """How far a near-leg row drawn upright moves to follow our near leg (hip 119.9, knee 120.5,
    ankle 116.8, foot 111-119)."""
    if y <= 193:
        return 0
    if y <= 207:
        return -round((y - 193) / 14 * 2)
    return -3


def far_shift(y):
    """The same for our far leg (hip 132.9, knee 139.6, ankle 137.3, foot 135-147)."""
    if y <= 183:
        return 1
    if y <= 186:
        return 2
    if y <= 194:
        return 3
    if y <= 203:
        return 3 - round((y - 194) / 9 * 2)
    return 1


class Canvas:
    def __init__(self, x0, y0, x1, y1, fill='.'):
        self.x0, self.y0, self.x1, self.y1 = x0, y0, x1, y1
        self.g = [[fill] * (x1 - x0) for _ in range(y1 - y0)]

    def p(self, x, y, c):
        if self.x0 <= x < self.x1 and self.y0 <= y < self.y1:
            self.g[y - self.y0][x - self.x0] = c

    def h(self, xa, xb, y, c):
        for x in range(xa, xb + 1):
            self.p(x, y, c)

    def v(self, x, ya, yb, c):
        for y in range(ya, yb + 1):
            self.p(x, y, c)

    def rect(self, xa, ya, xb, yb, c):
        for y in range(ya, yb + 1):
            self.h(xa, xb, y, c)

    def art(self, x, y, rows):
        """Rows of characters at (x, y); ' ' leaves the canvas as it is."""
        for dy, r in enumerate(rows):
            for dx, ch in enumerate(r):
                if ch != ' ':
                    self.p(x + dx, y + dy, ch)

    def bent(self, x, y, rows, shift):
        """Rows drawn upright, each moved sideways by shift(row's y)."""
        for dy, r in enumerate(rows):
            for dx, ch in enumerate(r):
                if ch != ' ':
                    self.p(x + dx + shift(y + dy), y + dy, ch)

    def spans(self, y, segs):
        """A row as (x_from, string) segments."""
        for xa, s in segs:
            for i, ch in enumerate(s):
                if ch != ' ':
                    self.p(xa + i, y, ch)

    def below(self, y):
        """A copy holding only the rows from y down (to give them to another part)."""
        c = Canvas(self.x0, self.y0, self.x1, self.y1, ' ')
        for yy in range(max(y, self.y0), self.y1):
            c.g[yy - self.y0] = list(self.g[yy - self.y0])
        return c

    def rows(self):
        return [''.join(r) for r in self.g]

    def block(self, part):
        out = [f'@{part} {self.x0} {self.y0}']
        out += [r.replace(' ', '.') for r in self.rows()]
        return '\n'.join(out)
