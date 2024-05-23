#!/bin/bash

# Create a zip file that excludes any git files

zip -r -FS ../thunderbirdollama.zip * --exclude '*.git*'
