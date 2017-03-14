#!/usr/bin/env python

import os
import zipfile

f = zipfile.ZipFile('macros.package', 'w', zipfile.ZIP_DEFLATED)
old_dir = os.getcwd()
os.chdir('macros')
for root, dirs, files in os.walk('./'):
    for file in files:
        f.write(os.path.join(root, file))
f.close()
os.chdir(old_dir)
