#!/usr/bin/env python

uacc = [l.strip() for l in open('uacc.txt').read().split('\n')][:-1]
type = ''
for l in uacc:
    if '.' not in l:
        type = l
        print ''
        print 'let %s = menu.createMenu();' % type
        print '%s.title = "%s"' % (type, type)
        print 'menu.addMenu(%s)' % type
    else:
        i, name = [l.split('.')[0], ''.join(l.split('.')[1:])]
        i = int(i)
        name = name.strip()
        if name == '':
            continue

        print '%s.addCommandItem (JSTRANSLATE ("%s"), kMacrosCategory, "Macro " + Host.IO.toBase64("%s"), this);' \
            % (type, name, 'Articulations - %03d - %s - %s' % (i, type, name))
