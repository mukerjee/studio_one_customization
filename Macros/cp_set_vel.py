#!/usr/bin/env python

import copy

lines_o = open('Articulations - 001 - Longs - Generic.studioonemacro').read().split('\n')
lines = copy.deepcopy(lines_o)

uacc = [l.strip() for l in open('uacc.txt').read().split('\n')]
type = ''
for l in uacc:
    if '.' not in l:
        type = l
    else:
        name = ''
        i, name = [l.split('.')[0], ''.join(l.split('.')[1:])]
        i = int(i)
        name = name.strip()
        if i == 1:
            continue
        if name == '':
            continue
        print type, i, name

        lines[5] = ('value="' + str(i)).join(lines_o[5].split('value="1'))
        lines[1] = (type + ' - ' + name).join(lines_o[1].split("Longs - Generic"))
        open('Articulations - %03d - %s - %s.studioonemacro' % (i, type, name), 'w').write(
            '\n'.join(lines))
