import itertools as it


arr = [1, 2, 3, 4]
arr1, arr2  = [*[iter(arr)] * 2]
for x in arr1:
    print(x)

arr3 = zip(*[iter(arr)] * 2)
for l, r in arr3:
    print(l, r)

print('out!')
