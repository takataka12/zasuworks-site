"""Independent downloaded-artifact inspection; never executes a packaged binary."""
import hashlib, io, json, pathlib, plistlib, struct, sys, zipfile
EXPECTED_KEY='27fec33eb59362eaa51bcb7c0d178a1264d60a4a35e90f151f1a9a178c124b8d'

def slices(data):
    magic,count=struct.unpack_from('>II',data)
    if magic not in (0xcafebabe,0xcafebabf):raise ValueError('Expected Universal Mach-O')
    if count!=2:raise ValueError('Expected exactly two slices')
    result=[]
    for n in range(count):
        if magic==0xcafebabe:
            cpu,sub,offset,size,align=struct.unpack_from('>IIIII',data,8+20*n)
        else:
            cpu,sub,offset,size,align,reserved=struct.unpack_from('>IIQQII',data,8+32*n)
        if offset+size>len(data):raise ValueError('Invalid slice bounds')
        part=data[offset:offset+size]
        fields=struct.unpack_from('<IIIIIIII',part)
        if fields[0]!=0xfeedfacf or fields[1]!=cpu:raise ValueError('Unexpected slice header')
        pos=32;minimum=None
        for _ in range(fields[4]):
            cmd,length=struct.unpack_from('<II',part,pos)
            if length<8 or pos+length>len(part):raise ValueError('Invalid load command')
            if cmd in (0x32,0x24):
                version=struct.unpack_from('<I',part,pos+(12 if cmd==0x32 else 8))[0]
                minimum=f'{version>>16}.{(version>>8)&255}.{version&255}'
            pos+=length
        result.append((cpu,part,minimum))
    return result

def inspect(path, source, public_file):
    key=pathlib.Path(public_file).read_text().strip().lower().encode()
    assert hashlib.sha256(key).hexdigest()==EXPECTED_KEY
    with zipfile.ZipFile(path) as outer:
        def member(suffix):
            names=[n for n in outer.namelist() if n.endswith(suffix)];assert len(names)==1,(suffix,names)
            return outer.read(names[0])
        report=json.loads(member('mac-staging-candidate.json'))
        assert report['sourceCommit']==source and report['publicRelease'] is False and report['configuration']=='Release'
        assert report['environment']=='staging' and report['publicKeySha256']==EXPECTED_KEY
        assert all(report[x]=='NOT RUN' for x in ('developerId','notarization','staple','realAccount','logic','intelHardware'))
        archive=member('VOCAL-Mac-Universal-PRIVATE-STAGING-ADHOC.zip')
        digest=hashlib.sha256(archive).hexdigest()
        assert digest==member('VOCAL-Mac-Universal-PRIVATE-STAGING-ADHOC.zip.sha256').decode().split()[0]
        with zipfile.ZipFile(io.BytesIO(archive)) as z:
            names=z.namelist();assert len(names)==len(set(names))
            assert not any('..' in pathlib.PurePosixPath(n).parts or n.startswith('/') for n in names)
            actual=[]
            for entry in report['products']:
                kind=entry['format'];bundle={'AU':'ZASU VOCAL.component','VST3':'ZASU VOCAL.vst3','Standalone':'ZASU VOCAL.app'}[kind]
                base='private-mac-payload/'+kind+'/'+bundle+'/Contents/'
                info=plistlib.loads(z.read(base+'Info.plist'));assert info['CFBundleIdentifier']==entry['bundleIdentifier']
                data=z.read(base+'MacOS/'+info['CFBundleExecutable']);assert hashlib.sha256(data).hexdigest()==entry['binarySha256']
                values=slices(data);assert {v[0] for v in values}=={0x01000007,0x0100000c}
                for cpu,part,minimum in values:
                    assert key in part,'Missing compiled public key'
                    assert report['endpoint'].encode() in part,'Missing compiled API'
                    assert report['accountUrl'].encode() in part,'Missing compiled browser URL'
                    assert minimum=='11.0.0',minimum
                actual.append({'format':kind,'bundleIdentifier':info['CFBundleIdentifier'],'binarySha256':entry['binarySha256'],'sliceMinimumOS':{hex(cpu):minimum for cpu,_,minimum in values},'compiledKeyAndEndpointsMatch':True})
            assert {x['format'] for x in actual}=={'AU','VST3','Standalone'}
    return {'sourceCommit':source,'zipSha256':digest,'publicKeySha256':EXPECTED_KEY,'configuration':'Release','environment':'staging','publicRelease':False,'products':actual,'developerId':'NOT RUN','notarization':'NOT RUN','staple':'NOT RUN','hardware':'NOT RUN'}

if __name__=='__main__':
    result=inspect(sys.argv[1],sys.argv[2],sys.argv[3]);print(json.dumps(result,indent=2))
