import sys, json
from common import *
AL=json.load(open(R+'/align.json'))
def pair(n,an,fi,key=None,k=4,bg=(30,29,37)):
    b=AL['%s-%s-%d'%(n,an,fi)]; X,Y=b[3],b[4]
    fr=frames(n,an)[fi]; w,h=fr.size
    his=REF.crop((X,Y,X+w,Y+h))
    return row([up(his,k),up(over(fr,bg),k)],gap=6)
if __name__=='__main__':
    n,an,fi,k=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4])
    pair(n,an,fi,k=k).save(R+'/P-%s.png'%n)
