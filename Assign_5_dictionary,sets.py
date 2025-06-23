
dic = {"Tharun":22,"shiva":27,"Ram":90}
a = input("Enter the student name")
if a in dic:
	print(f"{a} marks is:{dic[a]}")
else:
	print("Invalid Student name")

#List Slicing
a = [1,2,3,4,5,6,7,8,9,10]
extracted = a[0:5]
print(f"extracted five elements:{extracted}")
print(f"Reversed extracted elements:{extracted[::-1]}")